exports.$ = (function () {
    var HitCircle = require('owp/HitCircle').$;
    var Cache = require('owp/Util/Cache').$;
    var shaders = require('owp/canvasShaders');

    var CanvasRenderer = function (context) {
        this.context = context;

        this.graphicsCache = new Cache();    // [ 'graphic-name', skin, shader, shaderData ] => graphic
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

        getShadedGraphic: function (skin, graphicName, shader, shaderData) {
            var renderer = this;
            var key = [ graphicName, skin, shader, shaderData ];

            return renderer.graphicsCache.get(key, function () {
                skin.getGraphic(graphicName, function (images) {
                    var shadedImages = [ ], i;

                    for (i = 0; i < images.length; ++i) {
                        shadedImages.push(shaders.applyShaderToImage(shader, shaderData, images[i]));
                    }

                    renderer.graphicsCache.set(key, shadedImages);
                });
            });
        },

        renderHitCircle: function (hitCircle, skin, progress, time) {
            var c = this.context;

            c.save();
            c.translate(hitCircle.x, hitCircle.y);

            var hitCircleGraphic = this.getShadedGraphic(skin, 'hitcircle', shaders.multiplyByColor, hitCircle.combo.color);
            var hitCircleFrame = 0;

            if (hitCircleGraphic) {
                c.drawImage(hitCircleGraphic[hitCircleFrame], -hitCircleGraphic[hitCircleFrame].width / 2, -hitCircleGraphic[hitCircleFrame].height / 2);
            }

            this.renderComboNumber(hitCircle.comboIndex + 1, skin);

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

            var approachCircleGraphic = this.getShadedGraphic(skin, 'approachcircle', shaders.multiplyByColor, hitObject.combo.color);
            var approachCircleFrame = 0;

            if (approachCircleGraphic) {
                c.drawImage(approachCircleGraphic[approachCircleFrame], -approachCircleGraphic[approachCircleFrame].width / 2, -approachCircleGraphic[approachCircleFrame].height / 2);
            }

            c.restore();
        },

        renderComboNumber: function (number, skin) {
            var c = this.context;

            var digits = '' + number;
            var scale = Math.pow(digits.length, -1 / 4) * 0.9;

            var i, image, digit;

            var graphic;
            var frame = 0;
            var images = [ ];
            var totalWidth = 0;
            var spacing = skin.hitCircleFontSpacing;

            for (i = 0; i < digits.length; ++i) {
                digit = digits[i];

                graphic = skin.getGraphic('default-' + digit);

                if (!graphic) {
                    break;
                }

                image = graphic[frame];

                images.push(image);

                totalWidth += image.width;
            }

            totalWidth += spacing * (images.length - 1);

            c.save();
            c.scale(scale, scale);
            c.translate(-totalWidth / 2, 0);

            for (i = 0; i < images.length; ++i) {
                image = images[i];

                c.drawImage(image, 0, -image.height / 2);

                c.translate(image.width + spacing, 0);
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
        },

        renderStoryboard: function (storyboard, assetManager, time) {
            var c = this.context;

            // Background
            var background = storyboard.getBackground(time);
            var backgroundGraphic;

            if (background) {
                backgroundGraphic = assetManager.get(background.fileName, 'image');

                if (backgroundGraphic) {
                    // Rectangle fitting
                    // TODO Clean up and move somewhere else!
                    var canvasAR = c.canvas.width / c.canvas.height;
                    var imageAR = backgroundGraphic.width / backgroundGraphic.height;
                    var scale;

                    if (imageAR > canvasAR) {
                        // Image is wider
                        scale = c.canvas.width / backgroundGraphic.width;
                    } else {
                        // Image is taller
                        scale = c.canvas.height / backgroundGraphic.height;
                    }

                    c.save();
                    c.translate(
                        (c.canvas.width - backgroundGraphic.width * scale) / 2,
                        (c.canvas.height - backgroundGraphic.height * scale) / 2
                    );
                    c.scale(scale, scale);
                    c.drawImage(backgroundGraphic, 0, 0);
                    c.restore();
                }
            }

            // TODO Real storyboard stuff
        }
    };

    return CanvasRenderer;
}());
