/*global console: false, window: false */
(function () {
    var $ = require('vendor/jquery').$;
    var CanvasRenderer = require('owp/CanvasRenderer').$;
    var RuleSet = require('owp/RuleSet').$;
    var Map = require('owp/Map').$;
    var MapState = require('owp/MapState').$;
    var HitCircle = require('owp/HitCircle').$;

    var audio = new window.Audio('assets/map.mp3');

    function debug(message) {
        console.log(message);
    }

    // Make the map (TODO actual loading)
    var ruleSet = new RuleSet();
    var map = new Map(ruleSet);
    var i;

    for (i = 0; i < 20; ++i) {
        map.objects.push(new HitCircle(i * 1000, Math.random() * 640, Math.random() * 480));
    }

    var mapState = new MapState(map);

    $(function () {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        $(canvas).appendTo(document.body);

        var canvasRenderer = new CanvasRenderer(canvas.getContext('2d'));

        var renderInterval = 20;

        window.setTimeout(function render() {
            var time = Math.round(audio.currentTime * 1000);

            canvasRenderer.beginRender();
            canvasRenderer.renderMap(mapState, time);
            canvasRenderer.endRender();

            window.setTimeout(render, renderInterval);
        }, renderInterval);

        audio.play();
    });
}());
