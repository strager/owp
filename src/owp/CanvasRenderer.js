exports.$ = (function () {
    var HitCircle = require('owp/HitCircle').$;

    var CanvasRenderer = function (context) {
        this.context = context;
    };

    CanvasRenderer.prototype = {
        beginRender: function () {
            var c = this.context;

            c.save();

            c.clearRect(0, 0, 640, 480);
        },

        endRender: function () {
            var c = this.context;

            c.restore();
        },

        renderMap: function (mapState, time) {
            var objects = mapState.getVisibleObjects(time);
            var i;

            for (i = 0; i < objects.length; ++i) {
                this.renderObject(objects[i], mapState.map.ruleSet, time);
            }
        },

        renderHitCircle: function (hitCircle, progress, time) {
            var c = this.context;

            c.save();
            c.translate(hitCircle.x, hitCircle.y);

            c.beginPath();
            c.arc(0, 0, 16, 0, 2 * Math.PI, false);
            c.fill();
            c.stroke();
            c.closePath();

            c.restore();
        },

        renderApproachCircle: function (progress, x, y) {
            var c = this.context;

            var radius = 16;

            if (progress > 0) {
                radius += 24 * (1 - progress);
            } else {
                radius += 4 * (1 - -progress);
            }

            c.save();
            c.translate(x, y);

            c.beginPath();
            c.arc(0, 0, radius, 0, 2 * Math.PI, false);
            c.stroke();
            c.closePath();

            c.restore();
        },

        renderObject: function (object, ruleSet, time) {
            var c = this.context;

            c.fillStyle = 'red';        // TODO
            c.strokeStyle = 'black';    // TODO

            var approachProgress = ruleSet.getObjectApproachProgress(object, time);

            c.globalAlpha = Math.abs(approachProgress);

            if (object instanceof HitCircle) {
                this.renderHitCircle(object, time);
                this.renderApproachCircle(approachProgress, object.x, object.y);
            } else {
                throw 'Unknown hit object type';
            }
        }
    };

    return CanvasRenderer;
}());
