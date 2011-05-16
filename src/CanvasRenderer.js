define('CanvasRenderer', [ 'HitCircle', 'HitMarker', 'Util/Cache', 'canvasShaders', 'MapState' ], function (HitCircle, HitMarker, Cache, shaders, MapState) {
    var CanvasRenderer = function (context) {
        var c = context;

        // [ 'graphic-name', skin, shader, shaderData ] => graphic
        var graphicsCache = new Cache();

        var getShadedGraphic = function (skin, graphicName, shader, shaderData) {
            var key = [ graphicName, skin, shader, shaderData ];

            return graphicsCache.get(key, function () {
                var images = skin.assetManager.get(graphicName, 'image-set');
                var shadedImages = [ ], i;

                for (i = 0; i < images.length; ++i) {
                    shadedImages.push(
                        shaders.applyShaderToImage(shader, shaderData, images[i])
                    );
                }

                return shadedImages;
            });
        };

        var drawImageCentred = function (image) {
            c.drawImage(
                image,
                -image.width / 2,
                -image.height / 2
            );
        };

        var getNumberImages = function (number, skin) {
            var digits = '' + number;

            var images = [ ];

            var i, digit, graphic;
            var frame = 0;

            for (i = 0; i < digits.length; ++i) {
                digit = digits[i];

                graphic = skin.assetManager.get('default-' + digit, 'image-set');

                images.push(graphic[frame]);
            }

            return images;
        };

        var renderComboNumber = function (number, skin) {
            var images = getNumberImages(number, skin);
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
        };

        var renderHitCircle = function (hitCircle, skin, progress, time) {
            // Hit circle base
            var hitCircleGraphic = getShadedGraphic(
                skin, 'hitcircle',
                shaders.multiplyByColor, hitCircle.combo.color
            );

            var hitCircleFrame = 0;

            drawImageCentred(hitCircleGraphic[hitCircleFrame]);

            // Combo numbering
            renderComboNumber(hitCircle.comboIndex + 1, skin);

            // Hit circle overlay
            var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay', 'image-set');
            var hitCircleOverlayFrame = 0;

            drawImageCentred(hitCircleOverlayGraphic[hitCircleOverlayFrame]);
        };

        var renderApproachCircle = function (hitObject, skin, progress, x, y) {
            var radius = 1;

            if (progress > 0) {
                radius += (1 - progress);
            } else {
                radius += (1 - (-progress)) / 4;
            }

            c.scale(radius, radius);

            var approachCircleGraphic = getShadedGraphic(
                skin, 'approachcircle',
                shaders.multiplyByColor, hitObject.combo.color
            );

            var approachCircleFrame = 0;

            if (approachCircleGraphic) {
                drawImageCentred(approachCircleGraphic[approachCircleFrame]);
            }
        };

        var renderHitMarker = function (hitMarker, skin, time) {
            c.save();
            c.translate(hitMarker.hitObject.x, hitMarker.hitObject.y);

            // Hit marker
            var hitMarkerGraphic = skin.assetManager.get('hit' + hitMarker.score, 'image-set');
            var hitMarkerFrame = 0;

            drawImageCentred(hitMarkerGraphic[hitMarkerFrame]);

            c.restore();
        };

        var renderObject = function (object, mapState, skin, time) {
            var scale = mapState.ruleSet.getCircleSize() / 128;

            var approachProgress = mapState.ruleSet.getObjectApproachProgress(object, time);

            c.globalAlpha = mapState.ruleSet.getObjectOpacity(object, time);

            if (object instanceof HitCircle) {
                c.save();
                c.translate(object.x, object.y);
                c.scale(scale, scale);

                renderHitCircle(object, skin, time);
                renderApproachCircle(object, skin, approachProgress);

                c.restore();
            } else if (object instanceof HitMarker) {
                c.globalAlpha = 1;

                renderHitMarker(object, skin, time);
            } else {
                throw 'Unknown hit object type';
            }
        };

        var renderBackground = function (graphic) {
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
        };

        return {
            beginRender: function () {
                c.save();

                c.clearRect(0, 0, 640, 480);
            },

            endRender: function () {
                c.restore();
            },

            renderMap: function (mapState, skin, time) {
                // Visible objects
                var objects = mapState.getVisibleObjects(time);

                // Hit markers
                objects = objects.concat(
                    mapState.timeline.getAllInTimeRange(time - 2000, time, MapState.HIT_MARKER_CREATION)
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
                    renderObject(objects[i], mapState, skin, time);
                }
            },

            renderStoryboard: function (storyboard, assetManager, time) {
                // Background
                var background = storyboard.getBackground(time);
                var backgroundGraphic;

                if (background) {
                    backgroundGraphic = assetManager.get(background.fileName, 'image');

                    renderBackground(backgroundGraphic);
                }

                // TODO Real storyboard stuff
            }
        };
    };

    return CanvasRenderer;
});
