define('gfx/CanvasRenderer', [ 'game/mapObject', 'util/Cache', 'gfx/canvasShaders', 'game/MapState', 'util/gPubSub', 'util/util', 'gfx/View', 'loading' ], function (mapObject, Cache, shaders, MapState, gPubSub, util, View, loadingImageSrc) {
    var transformOriginStyleProperty, transformStyleProperty;
    var transformTranslatePrefix, transformTranslateSuffix;
    var transformScalePrefix, transformScaleSuffix;
    var matrixTranslateSuffix;

    (function () {
        // Feature detection based off of
        // http://andrew-hoyer.com/experiments/rain/
        // Public domain

        var style = document.createElement('div').style;

        function getStyleName(propertyNames) {
            return propertyNames.filter(function (name) {
                return name in style;
            }).shift();
        }

        transformOriginStyleProperty = getStyleName([
            'transformOrigin',
            'WebkitTransformOrigin',
            'MozTransformOrigin',
            'msTransformOrigin',
            'OTransformOrigin'
        ]);

        transformStyleProperty = getStyleName([
            'transform',
            'WebkitTransform',
            'MozTransform',
            'msTransform',
            'OTransform'
        ]);

        var supportsTransform3D = !!getStyleName([
            'perspectiveProperty',
            'WebkitPerspective',
            'MozPerspective',
            'msPerspective',
            'OPerspective'
        ]);

        transformTranslatePrefix = supportsTransform3D ? 'translate3D(' : 'translate(';
        transformTranslateSuffix = supportsTransform3D ? ',0) ' : ') ';

        transformScalePrefix = supportsTransform3D ? 'scale3D(' : 'scale(';
        transformScaleSuffix = supportsTransform3D ? ',1) ' : ') ';

        // Firefox has a bug where it requires 'px' for translate matrix
        // elements (where it should accept plain numbers).
        matrixTranslateSuffix = transformStyleProperty === 'MozTransform' ? 'px' : '';
    }());

    function DOMAllocator(container) {
        this.container = container;

        this.touched = null;
        this.nodeCache = new Cache();
    }

    DOMAllocator.prototype = {
        begin: function () {
            this.touched = [ ];
        },

        end: function () {
            this.nodeCache.collect(function (key, value) {
                if (value && this.touched.indexOf(value) < 0) {
                    value.parentNode.removeChild(value);
                    return false;
                }
            }, this);
        },

        contained: function (container, callback) {
            var oldContainer = this.container;
            this.container = container;
            callback();
            this.container = oldContainer;
        },

        get: function (key, creator) {
            var node = this.nodeCache.get(key, creator);

            if (node) {
                this.touched.push(node);

                if (!node.parentNode) {
                    this.container.appendChild(node);
                }
            }

            return node;
        }
    };

    function getColorStyle(color) {
        function c(x) {
            var s = Math.floor(x).toString(16);
            return s.length === 1 ? '0' + s : s;
        }

        if (color.length === 3) {
            return 'rgb(' + color.join(',') + ')';
        } else if (color.length === 4) {
            return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (color[3] / 255) + ')';
        } else {
            throw new Error('Bad color: ' + JSON.stringify(color));
        }
    }

    function cloneAbsolute(element) {
        var newElement = element.cloneNode(true);
        newElement.style.position = 'absolute';
        return newElement;
    }

    function renderer(v) {
        // Les constants
        var dom, caches;
        var viewport;

        function consts(c) {
            dom = c.dom;
            caches = c.caches;
            viewport = c.viewport;
        }

        // Les variables
        var ruleSet, skin;
        var objects;
        var mouseHistory;
        var scoreHistory, comboHistory, accuracyHistory;
        var storyboard;
        var assetManager;
        var mapProgress;
        var breakiness;
        var time;

        function vars(v) {
            accuracyHistory = v.accuracyHistory;
            assetManager = v.assetManager;
            comboHistory = v.comboHistory;
            mouseHistory = v.mouseHistory;
            objects = v.objects;
            ruleSet = v.ruleSet;
            scoreHistory = v.scoreHistory;
            skin = v.skin;
            storyboard = v.storyboard;
            mapProgress = v.mapProgress;
            breakiness = v.breakiness;
            time = v.time;
        }

        var z = 0;

        // Views {{{
        var currentView;

        function view(v, callback) {
            z = 0; // Each view/layer has its own z space

            var oldView = currentView;
            currentView = v;

            var container = dom.get(v, function () {
                var div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.zIndex = '1'; // Make new z space per container
                return div;
            });
            container.style.left = v.mat[0] + 'px';
            container.style.top = v.mat[1] + 'px';

            dom.contained(container, callback);

            currentView = oldView;
        }
        // Views }}}

        // Rendering helpers {{{
        function setZ(node) {
            node.style.zIndex = z;
            ++z;
        }

        function style(el, styles) {
            var scale = styles.scale || 1;

            var owidth = styles.owidth || el.width;
            var oheight = styles.oheight || el.height;

            var rotation = styles.rotation || 0;

            var x = styles.x;
            var y = styles.y;

            var alpha = typeof styles.alpha === 'undefined' ? '1' : String(styles.alpha);

            if (el.style.opacity !== alpha) {
                el.style.opacity = alpha;
            }

            var transform =
                transformTranslatePrefix + (-owidth / 2) + 'px,' + (-oheight / 2) + 'px' + transformTranslateSuffix +
                transformScalePrefix + scale + ',' + scale + transformScaleSuffix +
                'rotate(' + rotation + 'rad) ' +
                transformTranslatePrefix + (x / scale) + 'px,' + (y / scale) + 'px' + transformTranslateSuffix;

            if (el.style[transformStyleProperty] !== transform) {
                el.style[transformStyleProperty] = transform;
            }
        }

        function getShadedGraphic(skin, graphicName, shader, shaderData) {
            var key = [ graphicName, skin, shader, shaderData ];

            return caches.graphics.get(key, function () {
                var image = skin.assetManager.get(graphicName, 'image');
                var shadedImage = shaders.applyShaderToImage(shader, shaderData, image);
                return shadedImage;
            });
        }

        function getCoord(x) {
            return Math.floor(x);
        }

        function getCharacters(string) {
            return ('' + string).split('');
        }

        var stringCharLut = (function () {
            var lut = [ ];
            var i;

            for (i = 0; i < 10; ++i) {
                lut[i] = i;
            }

            lut[','] = 'comma';
            lut['.'] = 'dot';
            lut['%'] = 'percent';
            lut['x'] = 'x';

            return lut;
        }());

        function getStringImages(prefix, assetManager, string) {
            return getCharacters(string).map(function (c) {
                return assetManager.get(prefix + stringCharLut[c] + '.png', 'image');
            });
        }

        function getMaxStringSize(images, options) {
            var scale = options.scale || 1;
            var spacing = options.spacing || 0;
            var length = options.length || 1;

            var maxImageWidth = images.reduce(function (acc, image) {
                return Math.max(acc, image.width);
            }, 0);

            var maxImageHeight = images.reduce(function (acc, image) {
                return Math.max(acc, image.height);
            }, 0);

            return [
                ((maxImageWidth + spacing) * scale) * length,
                maxImageHeight * scale
            ];
        }

        function getStringSize(images, options) {
            var scale = options.scale || 1;
            var spacing = options.spacing || 0;

            var width = images.reduce(function (acc, image) {
                return acc + image.width;
            }, 0);

            var maxHeight = images.reduce(function (acc, image) {
                return Math.max(acc, image.height);
            }, 0);

            return [
                (width + spacing * (length - 1)) * scale,
                maxHeight * scale
            ];
        }

        function renderCharactersCanvas(images, context, options) {
            var offset = 0;

            var scale = options.scale || 1;
            var spacing = options.spacing || 0;

            var totalWidth = images.reduce(function (acc, image) {
                return acc + image.width;
            }, 0);

            totalWidth += spacing * (images.length - 1);

            switch (options.align) {
            default:
            case 'left':
                offset = 0;
                break;
            case 'center':
                offset = -totalWidth / 2;
                break;
            case 'right':
                offset = -totalWidth;
                break;
            }

            var baseX = options.x || 0;
            var baseY = options.y || 0;

            images.forEach(function (image) {
                var width = image.width;
                var x = (offset + width / 2) * scale + baseX;
                var y = baseY;

                context.save();

                context.translate(x, y);
                context.scale(scale, scale);
                context.drawImage(image, -image.width / 2, -image.height / 2);

                context.restore();

                offset += width + spacing;
            });
        }

        function makeCharactersCanvas(images, canvas, options) {
            var size = getStringSize(images, options);

            // Resizing clears canvas
            canvas.width = Math.ceil(size[0]);
            canvas.height = Math.ceil(size[1]);

            var context = canvas.getContext('2d');

            renderCharactersCanvas(images, context, util.extend({
                x: 0,
                y: canvas.height / 2,
                scale: 1,
                align: 'left',
                spacing: skin.scoreFontSpacing
            }, options));
        }
        // Rendering helpers }}}

        // Map rendering {{{
        function renderComboNumber(number, x, y, context) {
            var images = getStringImages('default-', skin.assetManager, number);
            var scale = Math.pow(images.length, -1 / 4) * 0.9;

            return renderCharactersCanvas(images, context, {
                x: x,
                y: y,
                scale: scale,
                spacing: skin.hitCircleFontSpacing,
                align: 'center'
            });
        }

        function renderApproachProgress(object) {
            var alpha = ruleSet.getApproachCircleOpacity(object, time);
            var color = object.combo.color;

            var progress = ruleSet.getObjectApproachProgress(object, time);
            var radius;
            if (progress > 0) {
                radius = 1 + (1 - progress) * 2;
            } else {
                radius = 1;
            }

            renderApproachCircle(radius, object.x, object.y, color, alpha, object);
        }

        function renderApproachCircle(radius, x, y, color, alpha, object) {
            var el = dom.get([ 'approach-circle', object ], function () {
                var approachCircleGraphic = getShadedGraphic(
                    skin, 'approachcircle.png',
                    shaders.multiplyByColor, color
                );

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = approachCircleGraphic.width;
                canvas.height = approachCircleGraphic.height;

                var context = canvas.getContext('2d');
                context.drawImage(approachCircleGraphic, 0, 0);

                return canvas;
            });

            var g = skin.assetManager.get('approachcircle.png', 'image');

            style(el, {
                x: x,
                y: y,
                owidth: g.width,
                oheight: g.height,
                scale: radius * ruleSet.getCircleSize() / 128,
                alpha: alpha
            });

            setZ(el);
        }

        function renderHitCircleFace(color, number, c) {
            var hitCircleGraphic = getShadedGraphic(
                skin, 'hitcircle.png',
                shaders.multiplyByColor, color
            );

            var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay.png', 'image');

            c.drawImage(
                hitCircleGraphic,
                -hitCircleGraphic.width / 2,
                -hitCircleGraphic.height / 2
            );

            if (number !== null) {
                renderComboNumber(number, 0, 0, c);
            }

            c.drawImage(
                hitCircleOverlayGraphic,
                -hitCircleOverlayGraphic.width / 2,
                -hitCircleOverlayGraphic.height / 2
            );
        }

        function renderHitCircleObject(object) {
            var el = dom.get(object, function () {
                var hitCircleGraphic = getShadedGraphic(
                    skin, 'hitcircle.png',
                    shaders.multiplyByColor, object.combo.color
                );

                var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay.png', 'image');

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = Math.max(
                    hitCircleGraphic.width,
                    hitCircleOverlayGraphic.width
                );
                canvas.height = Math.max(
                    hitCircleGraphic.height,
                    hitCircleOverlayGraphic.height
                );

                var context = canvas.getContext('2d');

                context.save();
                context.translate(canvas.width / 2, canvas.height / 2);
                renderHitCircleFace(object.combo.color, object.comboIndex + 1, context);
                context.restore();

                return canvas;
            });

            if (!el) {
                return;
            }

            style(el, {
                x: object.x,
                y: object.y,
                alpha: ruleSet.getObjectOpacity(object, time),
                scale: ruleSet.getCircleSize() / 128
            });

            setZ(el);
        }

        function renderHitMarkerObject(object) {
            var el = dom.get(object, function () {
                var graphicName = ruleSet.getHitMarkerImageName(object);
                if (!graphicName) {
                    return null;
                }

                var hitMarkerGraphic = skin.assetManager.get(graphicName, 'image');
                var el = cloneAbsolute(hitMarkerGraphic);
                el.setAttribute('data-orig-size', hitMarkerGraphic.width + ',' + hitMarkerGraphic.height);
                return el;
            });

            if (!el) {
                return null;
            }

            var origSize = el.getAttribute('data-orig-size').split(',');

            style(el, {
                x: object.hitObject.x,
                y: object.hitObject.y,
                owidth: origSize[0],
                oheight: origSize[1],
                alpha: ruleSet.getObjectOpacity(object, time),
                scale: ruleSet.getHitMarkerScale(object, time)
            });

            setZ(el);
        }

        function renderSliderTrack(curve, color, c) {
            var points = curve.flattenCentrePoints();

            function draw() {
                c.beginPath();

                points.forEach(function (point, i) {
                    if (i === 0) {
                        c.moveTo(points[0][0], points[0][1]);
                    } else {
                        c.lineTo(point[0], point[1]);
                    }
                });

                c.stroke();
                c.closePath();
            }

            var adjustmentScale = 128 / (128 - 10); // Don't ask...
            var lineWidth = ruleSet.getCircleSize() / adjustmentScale;

            c.save();

            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.lineWidth = lineWidth;
            c.strokeStyle = '#FFFFFF';

            draw();

            c.lineWidth = lineWidth * 0.9;
            c.strokeStyle = getColorStyle(color);

            draw();

            c.restore();
        }

        function renderSliderBall(object) {
            var sliderBallGraphic = skin.assetManager.get('sliderb0.png', 'image');
            var el = dom.get([ 'slider-ball', object ], function () {
                return cloneAbsolute(sliderBallGraphic);
            });

            var sliderBallPosition = object.getSliderBallPosition(time, ruleSet);
            var angle = Math.atan2(sliderBallPosition[4], sliderBallPosition[3]);

            style(el, {
                x: sliderBallPosition[0],
                y: sliderBallPosition[1],
                owidth: sliderBallGraphic.width,
                oheight: sliderBallGraphic.height,
                rotation: angle,
                scale: ruleSet.getCircleSize() / 128
            });

            setZ(el);
        }

        function renderSliderTick(object) {
            if (object.hitMarker) {
                return;
            }

            var sliderTickGraphic = skin.assetManager.get('sliderscorepoint.png', 'image');
            var el = dom.get(object, function () {
                return cloneAbsolute(sliderTickGraphic);
            });

            style(el, {
                x: object.x,
                y: object.y,
                owidth: sliderTickGraphic.width,
                oheight: sliderTickGraphic.height,
                scale: ruleSet.getCircleSize() / 128
            });

            setZ(el);
        }

        function renderSliderObject(object) {
            var el = dom.get(object, function () {
                // We get the bounds so we can render to the smallest canvas possible
                var bounds = ruleSet.getObjectBoundingRectangle(object);

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.style.left = bounds[0] + 'px';
                canvas.style.top = bounds[1] + 'px';
                canvas.width = bounds[2];
                canvas.height = bounds[3];

                var context = canvas.getContext('2d');
                context.translate(-bounds[0], -bounds[1]);

                renderSliderTrack(object.curve, object.combo.color, context);

                var scale = ruleSet.getCircleSize() / 128;

                var lastPoint = object.curve.getEndPoint();
                context.save();
                context.translate(lastPoint[0], lastPoint[1]);
                context.scale(scale, scale);
                renderHitCircleFace(object.combo.color, null, context);
                context.restore();

                context.save();
                context.translate(object.x, object.y);
                context.scale(scale, scale);
                renderHitCircleFace(object.combo.color, object.comboIndex + 1, context);
                context.restore();

                return canvas;
            });

            var alpha = ruleSet.getObjectOpacity(object, time);

            el.style.opacity = alpha;

            setZ(el);

            object.ticks.forEach(renderSliderTick);

            // Next end (repeat arrow)
            // TODO Position properly when sliding
            var repeatArrow = object.ends.filter(function (end) {
                return !end.hitMarker && !end.isFinal;
            })[0];

            if (repeatArrow) {
                var reverseArrowGraphic = skin.assetManager.get('reversearrow.png', 'image');
                var repeatArrowEl = dom.get([ 'repeat-arrow', object ], function () {
                    return cloneAbsolute(reverseArrowGraphic);
                });

                style(repeatArrowEl, {
                    x: repeatArrow.x,
                    y: repeatArrow.y,
                    owidth: reverseArrowGraphic.width,
                    oheight: reverseArrowGraphic.height,
                    scale: ruleSet.getCircleSize() / 128 * ruleSet.getRepeatArrowScale(repeatArrow, time)
                });

                setZ(repeatArrowEl);
            }

            var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

            if (visibility === 'during') {
                renderSliderBall(object);
            }
        }

        function renderObject(object) {
            mapObject.match(object, {
                HitCircle:  renderHitCircleObject,
                HitMarker:  renderHitMarkerObject,
                Slider:     renderSliderObject,
                _: function () {
                    throw new TypeError('Unknown object type');
                }
            });
        }

        function renderObjectApproachProgress(object) {
            mapObject.match(object, {
                Slider: function () {
                    var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

                    if (visibility === 'appearing') {
                        renderApproachProgress(object);
                    }
                },
                HitCircle: function () {
                    renderApproachProgress(object);
                }
            });
        }

        function renderMap() {
            view(View.map, function () {
                var sortedObjects = ruleSet.getObjectsByZ(objects);

                sortedObjects.forEach(function (object) {
                    renderObject(object);

                    gPubSub.publish('tick');
                });

                sortedObjects.forEach(function (object) {
                    renderObjectApproachProgress(object);

                    gPubSub.publish('tick');
                });
            });
        }
        // Map rendering }}}

        // Cursor rendering {{{
        function renderCursorHead(state) {
            if (!state) {
                return;
            }

            var cursor = skin.assetManager.get('cursor.png', 'image');
            var el = dom.get('cursor', function () {
                return cloneAbsolute(cursor);
            });

            // TODO use style()
            var x = state.x - cursor.width / 2;
            var y = state.y - cursor.height / 2;

            el.style.left = x + 'px';
            el.style.top = y + 'px';

            setZ(el);
        }

        function renderCursor() {
            view(View.map, function () {
                renderCursorHead(mouseHistory.getDataAtTime(time));
            });
        }
        // Cursor rendering }}}

        // HUD rendering {{{
        function renderScore() {
            var digitCount = 7;
            var zeros = new Array(digitCount + 1).join('0');
            var score = scoreHistory.getDataAtTime(time) || 0;
            var string = (zeros + score).slice(-digitCount);

            var canvas = dom.get('score', function () {
                var size = getMaxStringSize(getStringImages('score-', skin.assetManager, '0123456789'), {
                    length: digitCount,
                    scale: 0.7,
                    spacing: skin.scoreFontSpacing
                });

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = Math.ceil(size[0]);
                canvas.height = Math.ceil(size[1]);

                canvas.style.left = (640 - size[0]) + 'px';
                canvas.style.top = (20 - size[1] / 2) + 'px';

                return canvas;
            });

            if (canvas.getAttribute('data-displayed') !== string) {
                canvas.width = canvas.width; // Clear

                var context = canvas.getContext('2d');

                renderCharactersCanvas(getStringImages('score-', skin.assetManager, string), context, {
                    x: canvas.width,
                    y: canvas.height / 2,
                    scale: 0.7,
                    align: 'right',
                    spacing: skin.scoreFontSpacing
                });

                canvas.setAttribute('data-displayed', string);
            }
        }

        function renderCombo() {
            var combo = comboHistory.getDataAtTime(time) || 0;
            var string = combo + 'x';

            var canvas = dom.get('combo', function () {
                var size = getMaxStringSize(getStringImages('score-', skin.assetManager, '0123456789x'), {
                    length: '99999x'.length, // Let's say this is the max combo...
                    scale: 0.7,
                    spacing: skin.scoreFontSpacing
                });

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = Math.ceil(size[0]);
                canvas.height = Math.ceil(size[1]);

                canvas.style.left = '0px';
                canvas.style.top = (460 - size[1] / 2) + 'px';

                return canvas;
            });

            if (canvas.getAttribute('data-displayed') !== string) {
                canvas.width = canvas.width; // Clear

                var context = canvas.getContext('2d');

                renderCharactersCanvas(getStringImages('score-', skin.assetManager, string), context, {
                    x: 0,
                    y: canvas.height / 2,
                    scale: 0.7,
                    align: 'left',
                    spacing: skin.scoreFontSpacing
                });

                canvas.setAttribute('data-displayed', string);
            }
        }

        function renderAccuracy() {
            var accuracy = accuracyHistory.getDataAtTime(time) || 0;
            var string = (accuracy * 100).toFixed(2) + '%';

            var canvas = dom.get('accuracy', function () {
                var size = getMaxStringSize(getStringImages('score-', skin.assetManager, '0123456789.%'), {
                    length: '100.00%'.length,
                    scale: 0.4,
                    spacing: skin.scoreFontSpacing
                });

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = Math.ceil(size[0]);
                canvas.height = Math.ceil(size[1]);

                canvas.style.left = (640 - size[0]) + 'px';
                canvas.style.top = (45 - size[1] / 2) + 'px';

                return canvas;
            });

            if (canvas.getAttribute('data-displayed') !== string) {
                canvas.width = canvas.width; // Clear

                var context = canvas.getContext('2d');

                renderCharactersCanvas(getStringImages('score-', skin.assetManager, string), context, {
                    x: canvas.width,
                    y: canvas.height / 2,
                    scale: 0.4,
                    align: 'right',
                    spacing: skin.scoreFontSpacing
                });

                canvas.setAttribute('data-displayed', string);
            }
        }

        function mapProgressColour(progress) {
            var c = (progress * 32 + 192);
            return [ c, c, c ];
        }

        function renderMapProgress(progress) {
            var MAP_PROGRESS_HEIGHT = 6;

            var el = dom.get('mapProgress', function () {
                var el = document.createElement('div');
                el.position = 'absolute';
                return el;
            });

            el.style.backgroundColor = getColorStyle(mapProgressColour(progress));
            el.style.marginLeft = '0px';
            el.style.marginTop = (480 - MAP_PROGRESS_HEIGHT) + 'px';
            el.style.width = (640 * progress) + 'px';
            el.style.height = MAP_PROGRESS_HEIGHT + 'px';

            setZ(el);
        }

        function renderHud() {
            view(View.hud, function () {
                renderScore();
                renderCombo();
                renderAccuracy();
                renderMapProgress(mapProgress);
            });
        }
        // HUD rendering }}}

        // Storyboard rendering {{{
        function renderBackground() {
            var background = storyboard.getBackground(time);

            if (!background) {
                return;
            }

            var backgroundGraphic = assetManager.get(background.fileName, 'image');

            var el = dom.get(backgroundGraphic, function () {
                return cloneAbsolute(backgroundGraphic);
            });

            var scale = util.fitOuterRectangleScale(
                viewport.width, viewport.height,
                backgroundGraphic.width, backgroundGraphic.height
            );

            var brightness = 1 - (1 - breakiness) / 6;

            // FIXME CHROME BUGS OUT ON THIS
            style(el, {
                x: 320,
                y: 240,
                owidth: backgroundGraphic.width,
                oheight: backgroundGraphic.height,
                alpha: brightness,
                scale: scale
            });
        }

        function renderStoryboard() {
            view(View.storyboard, function () {
                renderBackground();

                // TODO Real storyboard stuff
            });
        }
        // Storyboard rendering }}}

        // Loading rendering {{{
        function renderLoading() {
            var el = dom.get('loading', function () {
                var sWidth = 640;
                var sHeight = 480;

                var img = document.createElement('img');
                img.style.display = 'none';

                img.onload = function () {
                    var width = img.width;
                    var height = img.height;

                    var size = 0.6;
                    var scale = util.fitRectangleScale(sWidth * size, sHeight * size, width, height);

                    img.style.display = 'block';
                    img.style.position = 'absolute';
                    img.style.left = ((sWidth - width * scale) / 2) + 'px';
                    img.style.top = ((sHeight - height * scale) / 2) + 'px';
                    img.style.width = (width * scale) + 'px';
                    img.style.height = (height * scale) + 'px';
                };

                img.src = loadingImageSrc;

                var container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '0px';
                container.style.top = '0px';
                container.style.width = sWidth + 'px';
                container.style.height = sHeight + 'px';
                container.style.background = '#000000';

                container.appendChild(img);

                return container;
            });

            setZ(el);
        }
        // Loading rendering }}}

        // Ready-to-play rendering {{{
        function renderReadyToPlay() {
            view(View.global, function () {
                var el = dom.get('ready-to-play', function () {
                    var el = cloneAbsolute(skin.assetManager.get('ready-to-play.png', 'image'));
                    el.style.left = '0px';
                    el.style.top = '0px';
                    el.style.width = '640px';
                    el.style.height = '480px';
                    return el;
                });

                setZ(el);
            });
        }
        // Ready-to-play rendering }}}

        function renderColourOverlay(colour) {
            view(View.global, function () {
                var el = dom.get('colour-overlay', function () {
                    var el = document.createElement('div');
                    el.style.position = 'absolute';
                    el.style.left = '0px';
                    el.style.top = '0px';
                    el.style.width = '640px';
                    el.style.height = '480px';
                    return el;
                });

                el.style.background = getColorStyle(colour);

                setZ(el);
            });
        }

        // User interface {{{
        function renderUiControl(control) {
            if (control.image) {
                var image = control.image();

                var el = dom.get(control, function () {
                    return cloneAbsolute(image);
                });

                // TODO Height scaling
                var scale = control.width() / image.width;

                style(el, {
                    x: control.centerX(),
                    y: control.centerY(),
                    owidth: image.width,
                    oheight: image.height,
                    scale: scale
                });
            }

            if (control.text) {
                var canvas = dom.get(control, function () {
                    var canvas = document.createElement('canvas');
                    canvas.style.position = 'absolute';
                    return canvas;
                });

                var text = control.text();
                var characterScale = control.characterScale();
                var alignX = control.alignX();
                var alignY = control.alignY();

                var data = {
                    text: text,
                    characterScale: characterScale,
                    alignX: alignX,
                    alignY: alignY
                };

                var dataString = JSON.stringify(data);

                if (canvas.getAttribute('data-displayed') !== dataString) {
                    var images = getStringImages('score-', skin.assetManager, text);
                    makeCharactersCanvas(images, canvas, {
                        scale: characterScale
                    });

                    canvas.setAttribute('data-displayed', dataString);
                }

                // TODO Use centerX/centerY
                style(canvas, {
                    x: (control.x() + canvas.width / 2) - canvas.width * alignX,
                    y: (control.y() + canvas.height / 2) - canvas.height * alignY,
                    scale: scale
                });
            }
        }

        function renderUi(ui) {
            view(View.global, function () {
                ui.controls.forEach(renderUiControl);
            });
        }
        // User interface }}}
        return {
            vars: vars,
            consts: consts,
            renderMap: renderMap,
            renderHud: renderHud,
            renderStoryboard: renderStoryboard,
            renderLoading: renderLoading,
            renderReadyToPlay: renderReadyToPlay,
            renderCursor: renderCursor,
            renderColourOverlay: renderColourOverlay,
            renderUi: renderUi
        };
    }

    function CanvasRenderer() {
        var front = document.createElement('div');
        front.style.display = 'block';
        front.style.overflow = 'hidden';
        front.style.position = 'absolute';
        front.style.background = 'black';
        var frontDom = new DOMAllocator(front);

        var container = document.createElement('div');
        container.style.display = 'block';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        container.appendChild(front);

        var caches = {
            // [ 'graphic-name', skin, shader, shaderData ] => graphic
            graphics: new Cache(),

            // [ graphic, canvasWidth, canvasHeight ] => graphic
            background: new Cache(),

            // [ sliderObject, ruleSet, skin ] => { image, pointCount }
            // TODO Cache + snake
            //sliderTrack: new Cache(),

            // [ graphic, scale ] => graphic
            scaledImages: new Cache()
        };

        var r = renderer();
        var viewport = { };

        function resize(width, height) {
            container.style.width = width + 'px';
            container.style.height = height + 'px';
            front.style.width = '640px';
            front.style.height = '480px';

            var factor = util.fitRectangleScale(width, height, 640, 480);
            var rect = util.fitRectangle(width, height, 640, 480);

            viewport = {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: Math.min(width, rect.width),
                height: Math.min(height, rect.height)
            };

            if (typeof window.opera !== 'undefined' && Object.prototype.toString.call(window.opera) === '[object Opera]') {
                // FIXME Opera goes to shit if we scale!
                if (factor !== 1) {
                    throw new Error('Scaling in Opera is unsupported!');
                }
            }

            if (factor === 1) {
                front.style[transformStyleProperty] = '';
            } else {
                front.style[transformOriginStyleProperty] = '0 0';
                front.style[transformStyleProperty] =
                    transformScalePrefix + factor + ',' + factor + transformScaleSuffix;
            }

            front.style.marginLeft = rect.x + 'px';
            //front.style.marginTop = rect.y + 'px';
        }

        resize(640, 480);

        var skinInitd = false;

        function initSkin(skin) {
            if (skinInitd) {
                return;
            }

            var cursorGraphic = skin.assetManager.get('cursor.png', 'image');
            util.setCursorImage(container, cursorGraphic.src, cursorGraphic.width / 2, cursorGraphic.height / 2);

            skinInitd = true;
        }

        r.consts({
            caches: caches,
            dom: frontDom,
            viewport: viewport
        });

        return {
            element: container,
            animationElement: container,

            resize: resize,

            mouseToGame: function (x, y) {
                return {
                    x: (x - viewport.x) / viewport.width * 640,
                    y: (y - viewport.y) / viewport.height * 480
                }
            },

            beginRender: function () {
                frontDom.begin();
            },

            endRender: function () {
                frontDom.end();
            },

            renderMap: function (state, time) {
                initSkin(state.skin, state.ruleSet);

                r.vars({
                    objects: state.objects,
                    ruleSet: state.ruleSet,
                    skin: state.skin,
                    mouseHistory: state.mouseHistory,
                    time: time
                });

                r.renderMap();
            },

            renderHud: function (state, time) {
                initSkin(state.skin, state.ruleSet);

                r.vars({
                    skin: state.skin,
                    ruleSet: state.ruleSet,
                    scoreHistory: state.scoreHistory,
                    accuracyHistory: state.accuracyHistory,
                    comboHistory: state.comboHistory,
                    mapProgress: state.mapProgress,
                    time: time
                });

                r.renderHud();
            },

            renderStoryboard: function (state, time) {
                r.vars({
                    assetManager: state.assetManager,
                    storyboard: state.storyboard,
                    breakiness: state.breakiness,
                    time: time
                });

                r.renderStoryboard();
            },

            renderLoading: function (time) {
                r.vars({
                    time: time
                });

                r.renderLoading();
            },

            renderReadyToPlay: function (skin, time) {
                r.vars({
                    skin: skin,
                    time: time
                });

                r.renderReadyToPlay();
            },

            renderCursor: function (skin, mouseHistory, time) {
                r.vars({
                    skin: skin,
                    mouseHistory: mouseHistory,
                    time: time
                });

                r.renderCursor();
            },

            renderColourOverlay: function (colour) {
                r.renderColourOverlay(colour);
            },

            renderUi: function (ui) {
                r.renderUi(ui);
            }
        };
    }

    return CanvasRenderer;
});
