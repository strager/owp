/*global console: false, window: false */
(function () {
    var $ = require('vendor/jquery').$;
    var CanvasRenderer = require('owp/CanvasRenderer').$;
    var RuleSet = require('owp/RuleSet').$;
    var Map = require('owp/Map').$;
    var MapState = require('owp/MapState').$;
    var MapInfo = require('owp/MapInfo').$;
    var MapFileReader = require('owp/MapFileReader').$;
    var HitCircle = require('owp/HitCircle').$;
    var Skin = require('owp/Skin').$;

    function debug(message) {
        console.log(message);
    }

    function loadMap(osuFileName, onLoad) {
        $.get(osuFileName, function (data) {
            var mapInfo = MapFileReader.read(MapFileReader.parseString(data));

            onLoad(mapInfo);
        }, 'text');
    }

    var skin = new Skin('skin');

    $(function () {
        // Init
        var mapState = null;

        var audio = new window.Audio();

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

            if (mapState) {
                canvasRenderer.renderMap(mapState, skin, time);
            }

            canvasRenderer.endRender();

            var renderInterval = 20;
            window.setTimeout(render, renderInterval);
        }

        render();

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
        loadMap('assets/map.osu', function (mapInfo) {
            mapState = MapState.fromMapInfo(mapInfo);

            audio.src = 'assets/' + mapInfo.audioFile;

            audio.play();
        });
    });
}());
