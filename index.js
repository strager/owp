/*global console: false, window: false */
(function () {
    var $ = require('vendor/jquery').$;
    var CanvasRenderer = require('owp/CanvasRenderer').$;
    var RuleSet = require('owp/RuleSet').$;
    var Map = require('owp/Map').$;
    var MapState = require('owp/MapState').$;
    var MapInfo = require('owp/MapInfo').$;
    var HitCircle = require('owp/HitCircle').$;
    var Skin = require('owp/Skin').$;

    var audio = new window.Audio('assets/map.mp3');

    function debug(message) {
        console.log(message);
    }

    // Make the map (TODO actual loading)
    var ruleSet = new RuleSet();
    ruleSet.appearTime = 1000;
    ruleSet.disappearTime = 100;

    var map = new Map();
    var i;

    for (i = 0; i < 20; ++i) {
        map.objects.push(new HitCircle(i * 1000, Math.random() * 640, Math.random() * 480));
    }

    var mapInfo = new MapInfo(ruleSet, map);

    var mapState = MapState.fromMapInfo(mapInfo);
    var skin = new Skin('skin');

    $(function () {
        // Init
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
            canvasRenderer.renderMap(mapState, skin, time);
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
        audio.play();
    });
}());
