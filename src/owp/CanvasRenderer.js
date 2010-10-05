exports.$ = (function () {
    var HitCircle = require('owp/HitCircle').$;
    var Cache = require('owp/Util/Cache').$;

    var CanvasRenderer = function (context) {
        this.context = context;

        this.graphicsCache = new Cache();    // [ 'graphic-name', skin, filter ] => graphic
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

        filterImage: function (image, filter) {
            // TODO Move elsewhere
            // TODO Make shader functions/classes instead

            var newCanvas = document.createElement('canvas');
            newCanvas.width = image.width;
            newCanvas.height = image.height;

            var newContext = newCanvas.getContext('2d');

            newContext.globalCompositeOperation = 'copy';
            newContext.drawImage(image, 0, 0);

            var imageData = newContext.getImageData(0, 0, newCanvas.width, newCanvas.height);

            var i;

            if (filter instanceof Array) {
                // [ r, g, b ]
                for (i = 0; i < imageData.width * imageData.height; ++i) {
                    imageData.data[i * 4 + 0] *= filter[0] / 256;
                    imageData.data[i * 4 + 1] *= filter[1] / 256;
                    imageData.data[i * 4 + 2] *= filter[2] / 256;
                }
            } else {
                throw 'Unknown filter ' + filter;
            }

            newContext.putImageData(imageData, 0, 0);

            return newCanvas;
        },

        getFilteredGraphic: function (skin, graphicName, filter) {
            // TODO Move elsewhere ?

            var renderer = this;
            var key = [ graphicName, skin, filter ];

            return renderer.graphicsCache.get(key, function () {
                skin.getGraphic(graphicName, function (images) {
                    var filteredImages = [ ], i;

                    for (i = 0; i < images.length; ++i) {
                        filteredImages.push(renderer.filterImage(images[i], filter));
                    }

                    renderer.graphicsCache.set(key, filteredImages);
                });
            });
        },

        renderHitCircle: function (hitCircle, skin, progress, time) {
            var c = this.context;

            c.save();
            c.translate(hitCircle.x, hitCircle.y);

            var hitCircleGraphic = this.getFilteredGraphic(skin, 'hitcircle', hitCircle.combo.color);
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

        renderApproachCircle: function (hitObject, skin, progress, x, y) {
            var c = this.context;

            var radius = 1;

            if (progress > 0) {
                radius += (1 - progress);
            } else {
                radius += (1 - (-progress)) / 4;
            }

            c.save();
            c.translate(hitObject.x, hitObject.y);
            c.scale(radius, radius);

            var approachCircleGraphic = this.getFilteredGraphic(skin, 'approachcircle', hitObject.combo.color);
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
                this.renderApproachCircle(object, skin, approachProgress);
            } else {
                throw 'Unknown hit object type';
            }
        }
    };

    return CanvasRenderer;
}());
