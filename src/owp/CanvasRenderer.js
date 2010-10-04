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
                this.renderObject(objects[i], time);
            }
        },

        renderHitCircle: function (hitCircle, time) {
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

        renderObject: function (object, time) {
            var c = this.context;

            c.fillStyle = 'red';        // TODO
            c.strokeStyle = 'black';    // TODO

            if (object instanceof HitCircle) {
                this.renderHitCircle(object, time);
            } else {
                throw 'Unknown hit object type';
            }
        }
    };

    return CanvasRenderer;
}());
