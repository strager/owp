/*global console: false, window: false */
(function () {
    var $ = require('vendor/jquery').$;
    var CanvasRenderer = require('owp/CanvasRenderer').$;
    var RuleSet = require('owp/RuleSet').$;
    var Map = require('owp/Map').$;
    var MapState = require('owp/MapState').$;
    var HitCircle = require('owp/HitCircle').$;
    var Skin = require('owp/Skin').$;
    var AssetManager = require('owp/AssetManager').$;

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

        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        $(canvas).appendTo(document.body);

        var canvasRenderer = new CanvasRenderer(canvas.getContext('2d'));

        // Render loop logic
        var shouldRender = true;

        function render() {
            if (!shouldRender) {
                return;
            }

            var time = Math.round(audio.currentTime * 1000);

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

        // Lower CPU usage when not active
        function inactive() {
            shouldRender = false;
        }

        function active() {
            if (!shouldRender) {
                shouldRender = true;
                render();
            }
        }

        $(window)
            .focus(active)
            .mousemove(active)
            .keydown(active)
            .blur(inactive);

        // Start!
        mapAssetManager.get('map', 'map', function (mapInfoParam) {
            mapInfo = mapInfoParam;

            mapState = MapState.fromMapInfo(mapInfo);

            mapAssetManager.get(mapInfo.audioFile, 'audio', function (a) {
                audio = a;

                audio.currentTime = 33; // XXX TEMP
                audio.play();

                render();
            });
        });
    });
}());
