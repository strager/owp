require([ 'WebGLRenderer', 'CanvasRenderer', 'AssetManager', 'q', 'Game', 'Util/FramerateCounter', 'Util/gPubSub', 'agentInfo' ], function (WebGLRenderer, CanvasRenderer, AssetManager, Q, Game, FramerateCounter, gPubSub, agentInfo) {
    var oldOnError = window.onerror;

    if (!DEBUG) {
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
    }

    if (DEBUG) {
        agentInfo.crashHandler.subscribe(function (crashInfo) {
            throw crashInfo.exception;
        });
    } else {
        agentInfo.crashReportHandler.subscribe(function (report) {
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
    var requestAnimFrame = (function(){
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

    var mapAssetManager = new AssetManager('assets');
    var skinAssetManager = new AssetManager('.');

    function init() {
        var renderers = [ ];
        var playAreas = [ ];

        function addRenderer(renderer, name) {
            renderers.push(renderer);
            playAreas.push(renderer.element);

            agentInfo.renderer = name;
        }

        try {
            addRenderer(new WebGLRenderer(), 'WebGL');
        } catch (e) {
            try {
                addRenderer(new CanvasRenderer(), 'DOM + Canvas');
            } catch (e) {
                throw new Error('Browser not supported');
            }
        }

        return {
            renderers: renderers,
            playAreas: playAreas
        };
    }

    function loop(callback, interval) {
        function innerLoop() {
            Q.when(callback(), function () {
                setTimeout(innerLoop, interval);
            });
        }

        innerLoop();
    }

    function hardLoop(callback, interval) {
        var timer = setInterval(function () {
            if (callback() === false) {
                clearInterval(timer);
            }
        }, interval);
    }

    function renderLoop(callback) {
        requestAnimFrame(function () {
            callback();
            renderLoop(callback);
        }, document.body); // should prolly use the canvas here...
    }

    function infLoop(callback) {
        hardLoop(function () {
            var i;

            for (i = 0; i < 10; ++i) {
                callback();
            }
        }, 0);
    }

    var renderFps = new FramerateCounter();
    var gameUpdateFps = new FramerateCounter();

    var game;

    function go(io) {
        game = new Game();
        game.setSkin(skinAssetManager);
        game.startMap(mapAssetManager, 'map');

        renderLoop(function () {
            io.renderers.forEach(function (renderer) {
                game.render(renderer);
            });

            renderFps.addTick();
        });

        infLoop(function () {
            gPubSub.publish('tick');

            gameUpdateFps.addTick();
        });

        var mouseX, mouseY;
        var isLeftDown = false;
        var isRightDown = false;

        // HACK
        var renderer = io.renderers[0];

        function mouseStateChanged() {
            var pos = renderer.mouseToGame(mouseX, mouseY);

            game.mouse({
                x: pos.x,
                y: pos.y,
                left: isLeftDown,
                right: isRightDown
            });
        }

        function button(event, callbacks) {
            var button;

            // Taken from jQuery
            if (!event.which && typeof event.button !== undefined) {
                button = event.button & 1 ? 1 : (event.button & 2 ? 3 : (event.button & 4 ? 2 : 0));
            } else {
                button = event.which;
            }

            var names = [ /* */, 'left', 'middle', 'right' ];
            var name = names[button];

            if (name && callbacks[name]) {
                callbacks[name]();
            }
        }

        io.playAreas.forEach(function (pa, i) {
            pa.addEventListener('mousedown', function (e) {
                mouseX = e.pageX - this.offsetLeft;
                mouseY = e.pageY - this.offsetTop;

                button(e, {
                    left: function () {
                        isLeftDown = true;
                    },
                    right: function () {
                        isRightDown = true;
                    }
                });

                mouseStateChanged();
                return false;
            }, false);

            pa.addEventListener('mouseup', function (e) {
                mouseX = e.pageX - this.offsetLeft;
                mouseY = e.pageY - this.offsetTop;

                button(e, {
                    left: function () {
                        isLeftDown = false;
                    },
                    right: function () {
                        isRightDown = false;
                    }
                });

                mouseStateChanged();
                return false;
            }, false);

            pa.addEventListener('contextmenu', function (e) {
                return false;
            }, false);

            pa.addEventListener('mousemove', function (e) {
                mouseX = e.pageX - this.offsetLeft;
                mouseY = e.pageY - this.offsetTop;
                mouseStateChanged();
            }, false);
        });

        document.addEventListener('keydown', function (e) {
            switch (e.which) {
            case 90: // LMB
                isLeftDown = true;
                break;

            case 88: // RMB
                isRightDown = true;
                break;
            }

            mouseStateChanged();
        }, false);

        document.addEventListener('keyup', function (e) {
            switch (e.which) {
            case 90: // LMB
                isLeftDown = false;
                break;

            case 88: // RMB
                isRightDown = false;
                break;
            }

            mouseStateChanged();
        }, false);

        var fullScreenButton = document.createElement('button');
        fullScreenButton.textContent = 'Full Screen';
        fullScreenButton.onclick = function () {
            // TODO Use (webkit|moz)RequestFullScreenWithKeys
            // HACK HACK hack =[
            var e = io.playAreas[0];
            e.className = 'full-screen';

            function resize() {
                renderer.resize(document.width, document.height);
            }

            resize();
            window.onresize = resize;
        };

        var playfield = document.getElementById('playfield');
        playfield.innerHTML = '';

        io.playAreas.forEach(function (playArea) {
            playfield.appendChild(playArea);
        });

        playfield.appendChild(fullScreenButton);
    }

    function getPaintCount() {
        return window.mozPaintCount || 0;
    }

    var lastPaintCount = 0;
    var paintFps = new FramerateCounter();

    function debugInfo() {
        var currentPaintCount = getPaintCount();
        paintFps.addTicks(currentPaintCount - lastPaintCount);
        lastPaintCount = currentPaintCount;

        var debug = {
            'paint fps': paintFps.framerate,
            'game update fps': gameUpdateFps.framerate,
            'render fps': renderFps.framerate
        };

        var gameDebug = game.debugInfo();
        var key;

        for (key in gameDebug) {
            if (Object.prototype.hasOwnProperty.call(gameDebug, key)) {
                debug[key] = gameDebug[key];
            }
        }

        return debug;
    }

    function updateDebugInfo() {
        if (!game) {
            return;
        }

        var debugElement = document.getElementById('debug');

        if (!debugElement) {
            return;
        }

        var debug = debugInfo();

        var text = Object.keys(debug).map(function (key) {
            var value = debug[key];

            if (typeof value === 'number') {
                value = value.toFixed(2);
            }

            return key + ': ' + value;
        }).join('\n');

        debugElement.textContent = text;
    }

    function getMissingFeatures() {
        var features = [ ];

        if (!window.Audio) {
            features.push('HTML5 <audio> element');
        }

        return features;
    }

    var missingFeatures = getMissingFeatures();

    if (missingFeatures.length > 0) {
        var text = 'Your browser is not supported; it is missing the following features:';
        text = [ text ].concat(missingFeatures).join('\n* ');

        var messageElement = document.createElement('pre');
        messageElement.textContent = text;
        document.body.appendChild(messageElement);

        return;
    }

    if (DEBUG) {
        loop(updateDebugInfo, 100);
    }

    Q.ref(init()).then(go);
});
