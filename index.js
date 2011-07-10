require([ 'jQuery', 'WebGLRenderer', 'CanvasRenderer', 'AssetManager', 'q', 'Game', 'Util/FramerateCounter', 'Util/gPubSub' ], function ($, WebGLRenderer, CanvasRenderer, AssetManager, Q, Game, FramerateCounter, gPubSub) {
    var mapAssetManager = new AssetManager('assets');
    var skinAssetManager = new AssetManager('.');

    function init() {
        var renderers = [ ];
        var playAreas = [ ];

        function addRenderer(renderer, name) {
            renderers.push(renderer);
            playAreas.push(renderer.element);

            $(document.body)
                .append('<h3>' + name + '</h3>')
                .append(renderer.element);
        }

        addRenderer(new CanvasRenderer(), '2D Canvas');
        addRenderer(new WebGLRenderer(), 'WebGL');

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
        window.requestAnimFrame(function () {
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

        function mouseStateChanged() {
            game.mouse({
                x: mouseX,
                y: mouseY,
                left: isLeftDown,
                right: isRightDown
            });
        }

        $(io.playAreas).mousedown(function (e) {
            mouseX = e.pageX - this.offsetLeft;
            mouseY = e.pageY - this.offsetTop;
            isLeftDown = true;
            mouseStateChanged();
            return false;
        });

        $(io.playAreas).mouseup(function (e) {
            mouseX = e.pageX - this.offsetLeft;
            mouseY = e.pageY - this.offsetTop;
            isLeftDown = false;
            mouseStateChanged();
            return false;
        });

        $(io.playAreas).bind('contextmenu', function (e) {
            return false;
        });

        $(io.playAreas).mousemove(function (e) {
            mouseX = e.pageX - this.offsetLeft;
            mouseY = e.pageY - this.offsetTop;
            mouseStateChanged();
        });

        $('body').keydown(function (e) {
            isLeftDown = true;
            mouseStateChanged();
        });

        $('body').keyup(function (e) {
            isLeftDown = false;
            mouseStateChanged();
        });
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

        return $.extend({ }, debug, game.debugInfo());
    }

    function updateDebugInfo() {
        if (!game) {
            return;
        }

        var $debug = $('#debug');

        if (!$debug.length) {
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

        $debug.text(text);
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

        $('<pre/>').text(text).appendTo('body');

        return;
    }

    loop(updateDebugInfo, 100);

    Q.when(init()).then(go);
});
