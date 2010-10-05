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

        renderMap: function (mapState, skin, time) {
            var objects = mapState.getVisibleObjects(time);
            var i;

            for (i = 0; i < objects.length; ++i) {
                this.renderObject(objects[i], mapState.ruleSet, skin, time);
            }
        },

        renderHitCircle: function (hitCircle, skin, progress, time) {
            var c = this.context;

            c.save();
            c.translate(hitCircle.x, hitCircle.y);

            // TODO Colouring
            var hitCircleGraphic = skin.getGraphic('hitcircle');
            var hitCircleFrame = 0;

            if (hitCircleGraphic) {
                c.drawImage(hitCircleGraphic[hitCircleFrame], -hitCircleGraphic[hitCircleFrame].width / 2, -hitCircleGraphic[hitCircleFrame].height / 2);
            }

            var hitCircleOverlayGraphic = skin.getGraphic('hitcircleoverlay');
            var hitCircleOverlayFrame = 0;

            if (hitCircleOverlayGraphic) {
                c.drawImage(hitCircleOverlayGraphic[hitCircleOverlayFrame], -hitCircleOverlayGraphic[hitCircleOverlayFrame].width / 2, -hitCircleOverlayGraphic[hitCircleOverlayFrame].height / 2);
            }

            c.restore();
        },

        renderApproachCircle: function (skin, progress, x, y) {
            var c = this.context;

            var radius = 1;

            if (progress > 0) {
                radius += (1 - progress);
            } else {
                radius += (1 - (-progress)) / 4;
            }

            c.save();
            c.translate(x, y);
            c.scale(radius, radius);

            // TODO Colouring
            var approachCircleGraphic = skin.getGraphic('approachcircle');
            var approachCircleFrame = 0;

            if (approachCircleGraphic) {
                c.drawImage(approachCircleGraphic[approachCircleFrame], -approachCircleGraphic[approachCircleFrame].width / 2, -approachCircleGraphic[approachCircleFrame].height / 2);
            }

            c.restore();
        },

        renderObject: function (object, ruleSet, skin, time) {
            var c = this.context;

            var approachProgress = ruleSet.getObjectApproachProgress(object, time);

            c.globalAlpha = Math.abs(approachProgress);

            if (object instanceof HitCircle) {
                this.renderHitCircle(object, skin, time);
                this.renderApproachCircle(skin, approachProgress, object.x, object.y);
            } else {
                throw 'Unknown hit object type';
            }
        }
    };

    return CanvasRenderer;
}());
