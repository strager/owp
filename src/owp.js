define('owp', [ 'game/Game', 'util/util', 'util/FramerateCounter', 'gfx/WebGLRenderer', 'gfx/CanvasRenderer', 'agentInfo', 'Input' ], function (Game, util, FramerateCounter, WebGLRenderer, CanvasRenderer, agentInfo, Input) {
    var PLAYAREA_WIDTH = 640;
    var PLAYAREA_HEIGHT = 480;

    var game = new Game();

    var renderFps = new FramerateCounter();

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

    function createFullscreenButton(renderer, playfield) {
        if (typeof window.opera !== 'undefined' && Object.prototype.toString.call(window.opera) === '[object Opera]') {
            // FIXME Opera goes to shit if we scale our pretty CanvasRenderer
            return null;
        }

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

        function toggleFullscreen() {
            if (inFullscreen) {
                disableFullscreen();
            } else {
                enableFullscreen();
            }
        }

        var fullscreenButton = document.createElement('button');
        fullscreenButton.textContent = 'Fullscreen';
        fullscreenButton.onclick = toggleFullscreen;
        return fullscreenButton;
    }

    function init(playfield) {
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
                return false;
            }
        }

        renderer.resize(PLAYAREA_WIDTH, PLAYAREA_HEIGHT);

        playfield.innerHTML = '';
        playfield.appendChild(playArea);

        var fullscreenButton = createFullscreenButton(renderer, playfield);
        if (fullscreenButton) {
            var fullscreenP = document.createElement('p');
            fullscreenP.style.textAlign = 'right';
            fullscreenP.appendChild(fullscreenButton);

            if (playfield.nextSibling) {
                playfield.parentNode.insertBefore(fullscreenP, playfield.nextSibling);
            } else {
                playfield.parentNode.appendChild(fullscreenP);
            }
        }

        // Start your engines!
        var input = new Input(document, game);
        input.addRenderer(renderer);

        renderLoop(function () {
            game.render(renderer);

            renderFps.addTick();
        }, playArea.animationElement);
    }

    function debugInfo() {
        var gameDebugInfo = game.debugInfo();

        return util.clone(gameDebugInfo, {
            'render fps': renderFps.framerate
        });
    }

    return {
        game: game,
        init: init,
        debugInfo: debugInfo
    };
});
