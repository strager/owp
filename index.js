define('index', [ 'gfx/WebGLRenderer', 'gfx/CanvasRenderer', 'AssetManager', 'q', 'game/Game', 'util/FramerateCounter', 'util/gPubSub', 'agentInfo', 'debugConsole', 'util/util', 'input' ], function (WebGLRenderer, CanvasRenderer, AssetManager, Q, Game, FramerateCounter, gPubSub, agentInfo, debugConsole, util, input) {
    var oldOnError = window.onerror;

    if (DEBUG) {
        agentInfo.crashHandler.subscribe(function (crashInfo) {
            console.error && console.error(crashInfo.exception.stack);
            throw crashInfo.exception;
        });
    } else {
        window.onerror = function (message, url, line) {
            try {
                if (typeof oldOnError === 'function') {
                    oldOnError.apply(this, arguments);
                }
            } catch (e) {
                // Ignore it.  We don't like them anyway.
            }

            try {
                agentInfo.crash([ message, url, line ]);
            } catch (e) {
                // Well fuck.  =\
                return true;
            }

            return false;
        };

        agentInfo.crashReportHandler.subscribe(function (report) {
            try {
                var notification = document.createElement('div');
                notification.className = 'notification error';
                notification.textContent = 'owp is having problems!  The issue has been reported to owp\'s developers.  Sorry for the inconvenience.';

                // Allow for CSS transitions
                notification.style.opacity = 0;
                setTimeout(function () {
                    try {
                        notification.style.opacity = 1;
                    } catch (e) {
                        // Whatever.
                    }
                }, 0);

                document.body.appendChild(notification);
            } catch (e) {
                // Whatever.
            }

            try {
                var xhr = new XMLHttpRequest();
                // If we get an error, oh well.

                xhr.open('POST', '/crash-report', true);
                xhr.send(JSON.stringify(report));
            } catch (e) {
                // Not much we can do now but annoy the user.  And we don't
                // want that, do we?
            }
        });
    }

    agentInfo.userAgent = window.navigator.userAgent;
    agentInfo.location = window.location.toString();

    // shim layer with setTimeout fallback
    var requestAnimFrame = (function () {
        function requestAnimationFrame(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }

        return window.requestAnimationFrame
            || window.webkitRequestAnimationFrame
            || window.mozRequestAnimationFrame
            || window.oRequestAnimationFrame
            || window.msRequestAnimationFrame
            || requestAnimationFrame;
    }());

    function nextTick(callback) {
        setTimeout(callback, 0);
    }

    function loop(callback, interval) {
        var innerLoop = agentInfo.catchAll(innerLoopImpl);
        nextTick(innerLoop);

        function innerLoopImpl() {
            setTimeout(innerLoop, interval);
            callback();
        }
    }

    function hardLoop(callback, interval) {
        var innerLoop = agentInfo.catchAll(innerLoopImpl);
        var timer = setInterval(innerLoop, interval);

        function innerLoopImpl() {
            if (callback() === false) {
                clearInterval(timer);
            }
        }
    }

    function renderLoop(callback, element) {
        var innerLoop = agentInfo.catchAll(innerLoopImpl);
        nextTick(innerLoop);

        function innerLoopImpl() {
            requestAnimFrame(innerLoop, element);
            callback();
        }
    }

    function infLoop(callback) {
        hardLoop(callback, 0);
    }

    var renderer, playArea;

    function setRenderer(ren, name) {
        renderer = ren;
        playArea = ren.element;

        agentInfo.renderer = name;
    }

    try {
        setRenderer(new WebGLRenderer(), 'WebGL');
    } catch (e) {
        try {
            setRenderer(new CanvasRenderer(), 'DOM + Canvas');
        } catch (e) {
            agentInfo.crash(new Error('Browser not supported'));
        }
    }

    var PLAYAREA_WIDTH = 640;
    var PLAYAREA_HEIGHT = 480;
    renderer.resize(PLAYAREA_WIDTH, PLAYAREA_HEIGHT);

    var renderFps = new FramerateCounter();
    var gameUpdateFps = new FramerateCounter();

    var game = new Game();
    window.game = game;

    renderLoop(function () {
        game.render(renderer);

        renderFps.addTick();
    }, playArea.animationElement);

    infLoop(function () {
        gPubSub.publish('tick');

        gameUpdateFps.addTick();
    });

    input.addRenderer(renderer);
    input.mouse.subscribe(function (mouseState) {
        game.mouse(mouseState);
    });

    var playfield = document.getElementById('playfield');
    if (playfield) {
        playfield.innerHTML = '';
        playfield.appendChild(playArea);

        var inFullscreen = false;
        var resizeTimeout = null;

        function resizeHandler() {
            if (resizeTimeout !== null) {
                window.clearTimeout(resizeTimeout);
            }

            resizeTimeout = window.setTimeout(function () {
                resizeTimeout = null;

                renderer.resize(playfield.clientWidth, playfield.clientHeight);
            }, 50);
        }

        function fullscreenCancelHandler(e) {
            if (e.which === 27) { // ESC key
                disableFullscreen();

                document.removeEventListener('keydown', fullscreenCancelHandler, false);

                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }

        function enableFullscreen() {
            if (inFullscreen) throw new Error('Bad state');

            playfield.className += ' fullscreen';
            window.addEventListener('resize', resizeHandler, false);
            document.addEventListener('keydown', fullscreenCancelHandler, false);

            resizeHandler();

            inFullscreen = true;
        }

        function disableFullscreen() {
            if (!inFullscreen) throw new Error('Bad state');

            playfield.className = playfield.className.replace(/(^| )fullscreen\b/g, '');
            window.removeEventListener('resize', resizeHandler, false);

            renderer.resize(PLAYAREA_WIDTH, PLAYAREA_HEIGHT);

            inFullscreen = false;
        }

        window.canFullscreen = true;

        if (typeof window.opera !== 'undefined' && Object.prototype.toString.call(window.opera) === '[object Opera]') {
            // FIXME Opera goes to shit if we scale our pretty CanvasRenderer
            window.canFullscreen = false;
        }

        window.toggleFullscreen = function () {
            if (inFullscreen) {
                disableFullscreen();
            } else {
                enableFullscreen();
            }
        };

        if (window.canFullscreen) {
            // HACK!
            var fullscreenButton = document.createElement('button');
            fullscreenButton.textContent = 'Fullscreen';
            fullscreenButton.onclick = window.toggleFullscreen;

            var fullscreenP = document.createElement('p');
            fullscreenP.style.textAlign = 'right';
            fullscreenP.appendChild(fullscreenButton);

            if (playfield.nextSibling) {
                playfield.parentNode.insertBefore(fullscreenP, playfield.nextSibling);
            } else {
                playfield.parentNode.appendChild(fullscreenP);
            }
        }
    }

    if (DEBUG) {
        debugConsole({
            debugInfo: function () {
                var gameDebugInfo = game && game.debugInfo();

                return util.clone(gameDebugInfo, {
                    'game update fps': gameUpdateFps.framerate,
                    'render fps': renderFps.framerate
                });
            }
        });
    }
});
