/*global console: false, window: false */

require([ 'jQuery', 'CanvasRenderer', 'RuleSet', 'Map', 'MapState', 'HitCircle', 'Skin', 'AssetManager' ], function ($, CanvasRenderer, RuleSet, Map, MapState, HitCircle, Skin, AssetManager) {
    function debug(message) {
        console.log(message);
    }

    var skin;
    (new AssetManager('.')).get('skin', 'skin', function (data) {
        skin = data;
    });

    var mapAssetManager = new AssetManager('assets');

    $(function () {
        // Init
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

        function render() {
            if (!shouldRender) {
                return;
            }

            var time = getMapTime();

            canvasRenderer.beginRender();

            if (mapInfo) {
                canvasRenderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
            }

            if (mapState) {
                canvasRenderer.renderMap(mapState, skin, time);
            }

            canvasRenderer.endRender();

            var renderInterval = 20;
            window.setTimeout(render, renderInterval);
        }

        // Start!
        mapAssetManager.get('map', 'map', function (mapInfoParam) {
            mapInfo = mapInfoParam;

            mapState = MapState.fromMapInfo(mapInfo);

            mapAssetManager.get(mapInfo.audioFile, 'audio', function (a) {
                audio = a;

                audio.controls = 'controls';
                document.body.appendChild(audio);

                audio.currentTime = 33; // XXX TEMP
                audio.play();

                render();
            });
        });
    });
});
