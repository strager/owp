define('CanvasRenderer', [ 'HitCircle', 'Slider', 'SliderTick', 'HitMarker', 'Util/Cache', 'canvasShaders', 'MapState', 'Util/gPubSub' ], function (HitCircle, Slider, SliderTick, HitMarker, Cache, shaders, MapState, gPubSub) {
    var renderMap = function (vars) {
        var mapState = vars.mapState;
        var ruleSet = mapState.ruleSet;
        var skin = vars.skin;
        var time = vars.time;
        var c = vars.context;
        var caches = vars.caches;
        var mouseHistory = vars.mouseHistory;

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

        var getCoord = function (x) {
            return Math.floor(x);
        };

        var drawImage = function (image, scale, x, y, cache) {
            var key = [ image, scale ];

            var scaledWidth = Math.ceil(image.width * scale);
            var scaledHeight = Math.ceil(image.height * scale);

            if (!cache) {
                c.drawImage(
                    image,
                    getCoord(x - scaledWidth / 2),
                    getCoord(y - scaledHeight / 2),
                    scaledWidth,
                    scaledHeight
                );

                return;
            }

            var scaledImage = caches.scaledImages.get(key, function () {
                // Cache scaled image
                var newCanvas = document.createElement('canvas');
                newCanvas.width = scaledWidth;
                newCanvas.height = scaledHeight;

                var newContext = newCanvas.getContext('2d');
                newContext.globalCompositeOperation = 'copy',
                newContext.drawImage(image, 0, 0, scaledWidth, scaledHeight);

                return newCanvas;
            });

            c.drawImage(
                scaledImage,
                getCoord(x - scaledImage.width / 2),
                getCoord(y - scaledImage.height / 2)
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

        var renderComboNumber = function (number, x, y) {
            var images = getNumberImages(number);
            var spacing = skin.hitCircleFontSpacing;

            if (images.length === 0) {
                // No images?  Don't render anything.
                return;
            }

            var totalWidth = images.reduce(function (acc, image) {
                return acc + image.width;
            }, 0);

            totalWidth += spacing * (images.length - 1);

            var scale = Math.pow(images.length, -1 / 4) * 0.9;
            scale *= ruleSet.getCircleSize() / 128;
            var offset = -totalWidth / 2;

            images.forEach(function (image) {
                drawImage(
                    image,
                    scale,
                    x + (offset + image.width / 2) * scale,
                    y,
                    true
                );

                offset += image.width + spacing;
            });
        };

        var renderHitCircle = function (hitCircle, progress) {
            var scale = ruleSet.getCircleSize() / 128;

            // Hit circle base
            var hitCircleGraphic = getShadedGraphic(
                skin, 'hitcircle',
                shaders.multiplyByColor, hitCircle.combo.color
            );

            var hitCircleFrame = 0;

            drawImage(
                hitCircleGraphic[hitCircleFrame],
                scale,
                hitCircle.x,
                hitCircle.y,
                true
            );

            // Combo numbering
            renderComboNumber(hitCircle.comboIndex + 1, hitCircle.x, hitCircle.y);

            // Hit circle overlay
            var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay', 'image-set');
            var hitCircleOverlayFrame = 0;

            drawImage(
                hitCircleOverlayGraphic[hitCircleOverlayFrame],
                scale,
                hitCircle.x,
                hitCircle.y,
                true
            );
        };

        var renderApproachCircle = function (hitObject, progress) {
            var radius = 1;

            if (progress > 0) {
                radius += (1 - progress);
            } else {
                radius += (1 - (-progress)) / 4;
            }

            radius *= ruleSet.getCircleSize() / 128;

            var approachCircleGraphic = getShadedGraphic(
                skin, 'approachcircle',
                shaders.multiplyByColor, hitObject.combo.color
            );

            var approachCircleFrame = 0;

            drawImage(
                approachCircleGraphic[approachCircleFrame],
                radius,
                hitObject.x, hitObject.y,
                false
            );
        };

        var renderHitMarker = function (hitMarker) {
            var scale = ruleSet.getHitMarkerScale(hitMarker, time);

            // Hit marker
            var hitMarkerGraphic = skin.assetManager.get('hit' + hitMarker.score, 'image-set');
            var hitMarkerFrame = 0;

            drawImage(
                hitMarkerGraphic[hitMarkerFrame],
                scale,
                hitMarker.hitObject.x,
                hitMarker.hitObject.y,
                true
            );
        };

        var renderHitCircleObject = function (object) {
            var approachProgress = ruleSet.getObjectApproachProgress(object, time);

            c.globalAlpha = ruleSet.getObjectOpacity(object, time);

            renderHitCircle(object);
            renderApproachCircle(object, approachProgress);
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

                drawImage(
                    sliderBallGraphic[sliderBallFrame],
                    scale,
                    sliderBallPosition[0],
                    sliderBallPosition[1],
                    true
                );
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

            renderHitCircle(object);

            var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

            if (visibility === 'during') {
                renderSliderBall(object);
            }

            var approachProgress = ruleSet.getObjectApproachProgress(object, time);
            renderApproachCircle(object, approachProgress);

            c.restore();
        };

        var renderSliderTickObject = function (object) {
            var sliderTickGraphic = skin.assetManager.get('sliderscorepoint', 'image-set');
            var sliderTickGraphicFrame = 0;

            var scale = ruleSet.getCircleSize() / 128;

            drawImage(
                sliderTickGraphic[sliderTickGraphicFrame],
                scale,
                object.x,
                object.y,
                true
            );
        };

        var getObjectRenderer = function (object) {
            var renderers = [
                [ HitCircle,  renderHitCircleObject ],
                [ HitMarker,  renderHitMarkerObject ],
                [ Slider,     renderSliderObject ],
                [ SliderTick, renderSliderTickObject ]
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

        var renderCursor = function (state) {
            if (!state) {
                return;
            }

            var cursorGraphic = skin.assetManager.get('cursor', 'image-set');
            var cursorFrame = 0;

            drawImage(cursorGraphic[cursorFrame], 1, state.x, state.y, false);
        };

        var renderCursorTrail = function (state, alpha) {
            if (!state) {
                return;
            }

            var cursorTrailGraphic = skin.assetManager.get('cursortrail', 'image-set');
            var cursorTrailFrame = 0;

            c.globalAlpha = alpha;

            drawImage(cursorTrailGraphic[cursorTrailFrame], 1, state.x, state.y, false);
        };

        var getObjectsToRender = function () {
            // Visible objects
            var objects = mapState.getVisibleObjects(time);

            // Hit markers
            objects = objects.concat(
                mapState.timeline.getAllInTimeRange(time - 2000, time, MapState.HIT_MARKER_CREATION)
            );

            return ruleSet.getObjectsByZ(objects);
        };

        getObjectsToRender().forEach(function (object) {
            renderObject(object);

            gPubSub.publish('tick');
        });

        var i;

        for (i = 0; i < 5; ++i) {
            renderCursorTrail(mouseHistory.getDataAtTime(time - (6 - i) * 30), i / 5);
        }

        renderCursor(mouseHistory.getDataAtTime(time));
    };

    var CanvasRenderer = function (context) {
        var c = context;

        var caches = {
            // [ 'graphic-name', skin, shader, shaderData ] => graphic
            graphics: new Cache(),

            // [ graphic, canvasWidth, canvasHeight ] => graphic
            background: new Cache(),

            // [ sliderObject, mapState, skin ] => { image, pointCount }
            sliderTrack: new Cache(),

            // [ graphic, scale ] => graphic
            scaledImages: new Cache()
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

            renderMap: function (state, time) {
                renderMap({
                    mapState: state.mapState,
                    skin: state.skin,
                    mouseHistory: state.mouseHistory,
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
