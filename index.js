/*global console: false, window: false */

require([ 'jQuery', 'CanvasRenderer', 'RuleSet', 'Map', 'MapState', 'HitCircle', 'Skin', 'AssetManager', 'q' ], function ($, CanvasRenderer, RuleSet, Map, MapState, HitCircle, Skin, AssetManager, Q) {
    function debug(message) {
        console.log(message);
    }

    var skinPromise = (new AssetManager('.')).load('skin', 'skin');
    var skinLoaded = false;

    Q.when(skinPromise, function (skin) {
        Q.when(skin.preload(), function () {
            skinLoaded = true;
        });
    });

    var mapAssetManager = new AssetManager('assets');

    $(function () {
        // Init
        var mapLoaded = false;

        var mapInfo = null;
        var mapState = null;
        var audio = null;

        function getMapTime() {
            return Math.round(audio.currentTime * 1000);
        }

        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        $(canvas).appendTo(document.body);

        var canvasRenderer = new CanvasRenderer(canvas.getContext('2d'));

        $(canvas).click(function (e) {
            var x = e.pageX - this.offsetLeft;
            var y = e.pageY - this.offsetTop;

            if (mapState) {
                mapState.makeHit(x, y, getMapTime());
            }
        });

        // Render loop logic
        var shouldRender = true;

        function renderImpl() {
            if (!skinLoaded || !mapLoaded) {
                return;
            }

            var time = getMapTime();

            canvasRenderer.beginRender();

            canvasRenderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);

            canvasRenderer.renderMap(mapState, skinPromise.valueOf(), time);

            canvasRenderer.endRender();
        }

        function render() {
            if (!shouldRender) {
                return;
            }

            renderImpl();

            var renderInterval = 20;
            window.setTimeout(render, renderInterval);
        }

        // Start!
        Q.when(mapAssetManager.load('map', 'map'), function (mapInfoParam) {
            mapInfo = mapInfoParam;

            mapState = MapState.fromMapInfo(mapInfo);

            Q.shallow([
                mapAssetManager.load(mapInfo.audioFile, 'audio'),
                mapInfo.storyboard.preload(mapAssetManager)
            ]).then(function (r) {
                audio = r[0];

                audio.controls = 'controls';
                document.body.appendChild(audio);

                audio.currentTime = 33; // XXX TEMP
                audio.play();

                mapLoaded = true;

                render();
            });
        });
    });
});
