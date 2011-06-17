define('CanvasRenderer', [ 'HitCircle', 'Slider', 'HitMarker', 'Util/Cache', 'canvasShaders', 'MapState' ], function (HitCircle, Slider, HitMarker, Cache, shaders, MapState) {
    var renderMap = function (vars) {
        var mapState = vars.mapState;
        var ruleSet = mapState.ruleSet;
        var skin = vars.skin;
        var time = vars.time;
        var c = vars.context;
        var caches = vars.caches;

        var getShadedGraphic = function (skin, graphicName, shader, shaderData) {
            var key = [ graphicName, skin, shader, shaderData ];

            return caches.graphics.get(key, function () {
                var images = skin.assetManager.get(graphicName, 'image-set');
                var shadedImages = [ ], i;

                images.forEach(function (image) {
                    shadedImages.push(
                        shaders.applyShaderToImage(shader, shaderData, image)
                    );
                });

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

        var getNumberImages = function (number) {
            var digits = '' + number;

            var images = [ ];

            var i, digit, graphic;
            var frame = 0;

            digits.split('').forEach(function (digit) {
                graphic = skin.assetManager.get('default-' + digit, 'image-set');

                images.push(graphic[frame]);
            });

            return images;
        };

        var renderComboNumber = function (number) {
            var images = getNumberImages(number);
            var spacing = skin.hitCircleFontSpacing;

            if (images.length === 0) {
                // No images?  Don't render anything.
                return;
            }

            var i;

            var totalWidth = images.reduce(function (acc, image) {
                return acc + image.width;
            }, 0);

            totalWidth += spacing * (images.length - 1);

            var scale = Math.pow(images.length, -1 / 4) * 0.9;

            c.save();
            c.scale(scale, scale);
            c.translate(-totalWidth / 2, 0);

            images.forEach(function (image) {
                c.drawImage(image, 0, -image.height / 2);

                c.translate(image.width + spacing, 0);
            });

            c.restore();
        };

        var renderHitCircle = function (hitCircle, progress) {
            // Hit circle base
            var hitCircleGraphic = getShadedGraphic(
                skin, 'hitcircle',
                shaders.multiplyByColor, hitCircle.combo.color
            );

            var hitCircleFrame = 0;

            drawImageCentred(hitCircleGraphic[hitCircleFrame]);

            // Combo numbering
            renderComboNumber(hitCircle.comboIndex + 1);

            // Hit circle overlay
            var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay', 'image-set');
            var hitCircleOverlayFrame = 0;

            drawImageCentred(hitCircleOverlayGraphic[hitCircleOverlayFrame]);
        };

        var renderApproachCircle = function (hitObject, progress, x, y) {
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

        var renderHitMarker = function (hitMarker) {
            c.save();
            c.translate(hitMarker.hitObject.x, hitMarker.hitObject.y);

            var scale = ruleSet.getHitMarkerScale(hitMarker, time);
            c.scale(scale, scale);

            // Hit marker
            var hitMarkerGraphic = skin.assetManager.get('hit' + hitMarker.score, 'image-set');
            var hitMarkerFrame = 0;

            drawImageCentred(hitMarkerGraphic[hitMarkerFrame]);

            c.restore();
        };

        var renderHitCircleObject = function (object) {
            var scale = ruleSet.getCircleSize() / 128;
            var approachProgress = ruleSet.getObjectApproachProgress(object, time);

            c.save();
            c.translate(object.x, object.y);
            c.scale(scale, scale);

            c.globalAlpha = ruleSet.getObjectOpacity(object, time);

            renderHitCircle(object);
            renderApproachCircle(object, approachProgress);

            c.restore();
        };

        var renderHitMarkerObject = function (object) {
            renderHitMarker(object);
        };

        var renderSliderTrack = function (points, object) {
            var key = [ object, mapState, skin ];

            var cachedTrack = caches.sliderTrack.get(key, function () {
                var sliderImage = document.createElement('canvas');
                sliderImage.width = c.canvas.width;
                sliderImage.height = c.canvas.height;

                return {
                    image: sliderImage,
                    pointCount: 0
                };
            });

            if (cachedTrack.pointCount > points.length) {
                // Cache has the slider track rendered "too much".
                // We need to re-render the whole track now.
                caches.sliderTrack.unset(key);
                renderSliderTrack(points, object);
                return;
            }

            var pointsToRender = points.slice(cachedTrack.pointCount);

            var sc = cachedTrack.image.getContext('2d');

            var hitCircleGraphic = getShadedGraphic(
                skin, 'hitcircle',
                shaders.multiplyByColor, object.combo.color
            );

            var hitCircleFrame = 0;

            var g = hitCircleGraphic[hitCircleFrame];
            var scale = ruleSet.getCircleSize() / 128;

            pointsToRender.forEach(function (point) {
                sc.save();
                sc.translate(point[0], point[1]);
                sc.scale(scale, scale);
                sc.drawImage(g, -g.width / 2, -g.height / 2);
                sc.restore();
            });

            cachedTrack.pointCount = points.length;

            // TODO Possible optimization: only render the part of the image
            // which contains slider data; currently it's the same size as the
            // playfield (ew! but easy!), which is (probably) inefficient
            c.drawImage(cachedTrack.image, 0, 0);
        };

        var renderSliderBall = function (object) {
            var sliderBallPosition = object.curve.getSliderBallPosition(object, time, ruleSet);

            if (sliderBallPosition) {
                var scale = ruleSet.getCircleSize() / 128;

                var sliderBallGraphic = skin.assetManager.get('sliderb0', 'image-set');
                var sliderBallFrame = 0;

                c.save();
                c.translate(sliderBallPosition[0], sliderBallPosition[1]);
                c.scale(scale, scale);
                drawImageCentred(sliderBallGraphic[sliderBallFrame]);
                c.restore();
            }
        };

        var renderSliderObject = function (object) {
            var growPercentage = ruleSet.getSliderGrowPercentage(object, time);
            var points = object.curve.render(growPercentage);

            if (!points.length) {
                return;
            }

            c.save();

            var scale = ruleSet.getCircleSize() / 128;
            var opacity = ruleSet.getObjectOpacity(object, time);

            c.globalAlpha = opacity;
            renderSliderTrack(points, object);

            c.save();
            c.translate(object.x, object.y);
            c.scale(scale, scale);
            renderHitCircle(object);
            c.restore();

            var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

            if (visibility === 'during') {
                renderSliderBall(object);
            }

            var approachProgress = ruleSet.getObjectApproachProgress(object, time);
            c.save();
            c.translate(object.x, object.y);
            c.scale(scale, scale);
            renderApproachCircle(object, approachProgress);
            c.restore();

            c.restore();
        };

        var getObjectRenderer = function (object) {
            var renderers = [
                [ HitCircle, renderHitCircleObject ],
                [ HitMarker, renderHitMarkerObject ],
                [ Slider,    renderSliderObject ]
            ];

            var objectRenderers = renderers.filter(function (r) {
                return object instanceof r[0];
            });

            if (objectRenderers.length !== 1) {
                throw new TypeError('Unknown object type');
            }

            return objectRenderers[0][1];
        };

        var renderObject = function (object) {
            var renderer = getObjectRenderer(object);
            renderer(object);
        };

        var getObjectsToRender = function () {
            // Visible objects
            var objects = mapState.getVisibleObjects(time);

            // Hit markers
            objects = objects.concat(
                mapState.timeline.getAllInTimeRange(time - 2000, time, MapState.HIT_MARKER_CREATION)
            );

            var sortObjectsByZ = function (a, b) {
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
            };

            // Get objects in Z order
            objects = objects.sort(sortObjectsByZ);

            return objects;
        };

        getObjectsToRender().forEach(function (object) {
            renderObject(object);
        });
    };

    var CanvasRenderer = function (context) {
        var c = context;

        var caches = {
            // [ 'graphic-name', skin, shader, shaderData ] => graphic
            graphics: new Cache(),

            // [ graphic, canvasWidth, canvasHeight ] => graphic
            background: new Cache(),

            // [ sliderObject, mapState, skin ] => { image, pointCount }
            sliderTrack: new Cache()
        };

        var renderBackground = function (graphic) {
            var key = [ graphic, c.canvas.width, c.canvas.height ];

            var backgroundGraphic = caches.background.get(key, function () {
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

                var backgroundCanvas = document.createElement('canvas');
                backgroundCanvas.width = c.canvas.width;
                backgroundCanvas.height = c.canvas.height;

                var bc = backgroundCanvas.getContext('2d');

                bc.globalCompositeOperation = 'copy';
                bc.translate(
                    (backgroundCanvas.width - graphic.width * scale) / 2,
                    (backgroundCanvas.height - graphic.height * scale) / 2
                );
                bc.scale(scale, scale);
                bc.drawImage(graphic, 0, 0);

                return backgroundCanvas;
            });

            c.drawImage(backgroundGraphic, 0, 0);
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
                renderMap({
                    mapState: mapState,
                    skin: skin,
                    time: time,
                    context: c,
                    caches: caches
                });
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
