require([ 'jQuery', 'CanvasRenderer', 'AssetManager', 'q', 'Game' ], function ($, CanvasRenderer, AssetManager, Q, Game) {
    var mapAssetManager = new AssetManager('assets');
    var skinAssetManager = new AssetManager('.');

    var init = function () {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        $(canvas).appendTo(document.body);

        var canvasRenderer = new CanvasRenderer(canvas.getContext('2d'));

        return {
            renderer: canvasRenderer,
            playArea: canvas
        };
    };

    var loop = function (callback, interval) {
        var innerLoop = function () {
            Q.when(callback(), function () {
                setTimeout(innerLoop, interval);
            });
        };

        innerLoop();
    };

    var go = function (io) {
        var game = new Game();
        game.setSkin(skinAssetManager);
        game.startMap(mapAssetManager, 'map');

        loop(function () {
            game.render(io.renderer);
        }, 20);

        loop(function () {
            game.update();
        }, 200);

        $(io.playArea).click(function (e) {
            var x = e.pageX - this.offsetLeft;
            var y = e.pageY - this.offsetTop;

            game.event('click', { x: x, y: y });
        });
    };

    Q.when(init()).then(go);
});
