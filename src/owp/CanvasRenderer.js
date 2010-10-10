exports.$ = (function () {
    var HitCircle = require('owp/HitCircle').$;
    var HitMarker = require('owp/HitMarker').$;
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
            // Visible objects
            var objects = mapState.getVisibleObjects(time);

            // Hit markers
            objects = objects.concat(
                mapState.hitMarkers.get(time, function start(hit) {
                    return hit.time;
                }, function end(hit) {
                    return hit.time + 2000; // FIXME config or whatever
                })
            );

            // Get objects in Z order
            objects = objects.sort(function (a, b) {
                var newA = a;
                var newB = b;

                // Keep hit marker above object
                if (a instanceof HitMarker) {
                    if (b === a.hitObject) {
                        return 1;
                    }

                    newA = a.hitObject;
                }

                if (b instanceof HitMarker) {
                    if (a === b.hitObject) {
                        return -1;
                    }

                    newB = b.hitObject;
                }

                // Sort by time descending
                return newA.time > newB.time ? -1 : 1;
            });

            var i;

            for (i = 0; i < objects.length; ++i) {
                this.renderObject(objects[i], mapState, skin, time);
            }
        },

        getShadedGraphic: function (skin, graphicName, shader, shaderData) {
            var renderer = this;
            var key = [ graphicName, skin, shader, shaderData ];

            return renderer.graphicsCache.get(key, function () {
                skin.getGraphic(graphicName, function (images) {
                    var shadedImages = [ ], i;

                    for (i = 0; i < images.length; ++i) {
                        shadedImages.push(
                            shaders.applyShaderToImage(shader, shaderData, images[i])
                        );
                    }

                    renderer.graphicsCache.set(key, shadedImages);
                });
            });
        },

        drawImageCentred: function (image) {
            this.context.drawImage(
                image,
                -image.width / 2,
                -image.height / 2
            );
        },

        renderHitCircle: function (hitCircle, skin, progress, time) {
            var c = this.context;

            // Hit circle base
            var hitCircleGraphic = this.getShadedGraphic(
                skin, 'hitcircle',
                shaders.multiplyByColor, hitCircle.combo.color
            );

            var hitCircleFrame = 0;

            if (hitCircleGraphic) {
                this.drawImageCentred(hitCircleGraphic[hitCircleFrame]);
            }

            // Combo numbering
            this.renderComboNumber(hitCircle.comboIndex + 1, skin);

            // Hit circle overlay
            var hitCircleOverlayGraphic = skin.getGraphic('hitcircleoverlay');
            var hitCircleOverlayFrame = 0;

            if (hitCircleOverlayGraphic) {
                this.drawImageCentred(hitCircleOverlayGraphic[hitCircleOverlayFrame]);
            }
        },

        renderApproachCircle: function (hitObject, skin, progress, x, y) {
            var c = this.context;

            var radius = 1;

            if (progress > 0) {
                radius += (1 - progress);
            } else {
                radius += (1 - (-progress)) / 4;
            }

            c.scale(radius, radius);

            var approachCircleGraphic = this.getShadedGraphic(
                skin, 'approachcircle',
                shaders.multiplyByColor, hitObject.combo.color
            );

            var approachCircleFrame = 0;

            if (approachCircleGraphic) {
                this.drawImageCentred(approachCircleGraphic[approachCircleFrame]);
            }
        },

        getNumberImages: function (number, skin) {
            var digits = '' + number;

            var images = [ ];

            var i, digit, graphic;
            var frame = 0;

            for (i = 0; i < digits.length; ++i) {
                digit = digits[i];

                graphic = skin.getGraphic('default-' + digit);

                if (!graphic) {
                    break;
                }

                images.push(graphic[frame]);
            }

            return images;
        },

        renderComboNumber: function (number, skin) {
            var c = this.context;

            var images = this.getNumberImages(number, skin);
            var totalWidth = 0;
            var spacing = skin.hitCircleFontSpacing;

            if (images.length === 0) {
                // No images?  Don't render anything.
                return;
            }

            var i;

            for (i = 0; i < images.length; ++i) {
                totalWidth += images[i].width;
            }

            totalWidth += spacing * (images.length - 1);

            var scale = Math.pow(images.length, -1 / 4) * 0.9;

            c.save();
            c.scale(scale, scale);
            c.translate(-totalWidth / 2, 0);

            var image;

            for (i = 0; i < images.length; ++i) {
                image = images[i];

                c.drawImage(image, 0, -image.height / 2);

                c.translate(image.width + spacing, 0);
            }

            c.restore();
        },

        renderHitMarker: function (hitMarker, skin, time) {
            var c = this.context;

            c.save();
            c.translate(hitMarker.hitObject.x, hitMarker.hitObject.y);

            // Hit marker
            var hitMarkerGraphic = skin.getGraphic('hit' + hitMarker.score);
            var hitMarkerFrame = 0;

            if (hitMarkerGraphic) {
                this.drawImageCentred(hitMarkerGraphic[hitMarkerFrame]);
            }

            c.restore();
        },

        renderObject: function (object, mapState, skin, time) {
            var c = this.context;
            var scale = mapState.ruleSet.getCircleSize() / 128;

            var approachProgress = mapState.ruleSet.getObjectApproachProgress(object, time);

            c.globalAlpha = Math.abs(approachProgress);

            if (object instanceof HitCircle) {
                c.save();
                c.translate(object.x, object.y);
                c.scale(scale, scale);

                this.renderHitCircle(object, skin, time);
                this.renderApproachCircle(object, skin, approachProgress);

                c.restore();
            } else if (object instanceof HitMarker) {
                c.globalAlpha = 1;

                this.renderHitMarker(object, skin, time);
            } else {
                throw 'Unknown hit object type';
            }
        },

        renderStoryboard: function (storyboard, assetManager, time) {
            // Background
            var background = storyboard.getBackground(time);
            var backgroundGraphic;

            if (background) {
                backgroundGraphic = assetManager.get(background.fileName, 'image');

                if (backgroundGraphic) {
                    this.renderBackground(backgroundGraphic);
                }
            }

            // TODO Real storyboard stuff
        },

        renderBackground: function (graphic) {
            var c = this.context;

            // TODO Split?

            var canvasAR = c.canvas.width / c.canvas.height;
            var imageAR = graphic.width / graphic.height;
            var scale;

            if (imageAR > canvasAR) {
                // Image is wider
                scale = c.canvas.width / graphic.width;
            } else {
                // Image is taller
                scale = c.canvas.height / graphic.height;
            }

            c.save();
            c.translate(
                (c.canvas.width - graphic.width * scale) / 2,
                (c.canvas.height - graphic.height * scale) / 2
            );
            c.scale(scale, scale);
            c.drawImage(graphic, 0, 0);
            c.restore();
        }
    };

    return CanvasRenderer;
}());
