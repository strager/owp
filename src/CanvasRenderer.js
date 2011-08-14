define('CanvasRenderer', [ 'mapObject', 'Util/Cache', 'canvasShaders', 'MapState', 'Util/gPubSub', 'Util/util', 'View', 'loading' ], function (mapObject, Cache, shaders, MapState, gPubSub, util, View, loadingImageSrc) {
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
            var s = x.toString(16);
            return s.length === 1 ? '0' + s : s;
        }

        return '#' + color.map(c).join('');
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
        var mapState, ruleSet, skin;
        var mouseHistory;
        var scoreHistory, comboHistory, accuracyHistory;
        var storyboard;
        var assetManager;
        var time;

        function vars(v) {
            accuracyHistory = v.accuracyHistory;
            comboHistory = v.comboHistory;
            mapState = v.mapState;
            mouseHistory = v.mouseHistory;
            ruleSet = v.ruleSet;
            scoreHistory = v.scoreHistory;
            skin = v.skin;
            time = v.time;
            storyboard = v.storyboard;
            assetManager = v.assetManager;
        }

        // Views {{{
        var currentView;

        function view(v, callback) {
            var oldView = currentView;
            currentView = v;

            var container = dom.get(v, function () {
                var div = document.createElement('div');
                div.style.position = 'absolute';
                return div;
            });
            container.style.left = v.mat[0] + 'px';
            container.style.top = v.mat[1] + 'px';

            dom.contained(container, callback);

            currentView = oldView;
        }
        // Views }}}

        // Rendering helpers {{{
        var z = 0;

        function setZ(node) {
            node.style.zIndex = z;
            ++z;
        }

        function getShadedGraphic(skin, graphicName, shader, shaderData) {
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
                return assetManager.get(prefix + stringCharLut[c], 'image-set')[0];
            });
        }

        function renderCharactersImages(images, context, options) {
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

            var ox = options.x || 0;
            var oy = options.y || 0;

            images.forEach(function (image, i) {
                var el = dom.get([ context, i ], function () {
                    var el = document.createElement('img');
                    el.style.position = 'absolute';
                    return el;
                });

                var width = image.width;
                var x = (offset + width / 2) * scale + ox;
                var y = oy;
                var scaledWidth = image.width * scale;
                var scaledHeight = image.height * scale;

                el.src = image.src;

                el.style.left = (x + -scaledWidth / 2) + 'px';
                el.style.top = (y + -scaledHeight / 2) + 'px';
                el.style.width = scaledWidth + 'px';
                el.style.height = scaledHeight + 'px';

                setZ(el);

                offset += width + spacing;
            });
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

            images.forEach(function (image) {
                var width = image.width;
                var x = (offset + width / 2) * scale;
                var y = 0;

                context.save();

                context.translate(x, y);
                context.scale(scale, scale);
                context.drawImage(image, -image.width / 2, -image.height / 2);

                context.restore();

                offset += width + spacing;
            });
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

        function renderApproachProgress(object, alpha) {
            var progress = ruleSet.getObjectApproachProgress(object, time);

            var radius;

            if (progress > 0) {
                radius = 1 + (1 - progress);
            } else {
                radius = 1 + (1 - (-progress)) / 4;
            }

            renderApproachCircle(radius, object.x, object.y, object.combo.color, alpha, object);
        }

        function renderApproachCircle(radius, x, y, color, alpha, object) {
            var el = dom.get([ 'approach-circle', object ], function () {
                var approachCircleGraphic = getShadedGraphic(
                    skin, 'approachcircle',
                    shaders.multiplyByColor, color
                );

                var approachCircleFrame = 0;

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = approachCircleGraphic[approachCircleFrame].width;
                canvas.height = approachCircleGraphic[approachCircleFrame].height;

                var context = canvas.getContext('2d');
                context.drawImage(approachCircleGraphic[approachCircleFrame], 0, 0);

                return canvas;
            });

            var g = skin.assetManager.get('approachcircle', 'image-set')[0];

            var scale = radius * ruleSet.getCircleSize() / 128;
            var width = getCoord(g.width * scale);
            var height = getCoord(g.height * scale);
            x = getCoord(x - width / 2);
            y = getCoord(y - height / 2);

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.width = width + 'px';
            el.style.height = height + 'px';
            el.style.opacity = alpha;

            setZ(el);
        }

        function renderHitCircleFace(color, number, c) {
            var hitCircleGraphic = getShadedGraphic(
                skin, 'hitcircle',
                shaders.multiplyByColor, color
            );
            var hitCircleFrame = 0;

            var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay', 'image-set');
            var hitCircleOverlayFrame = 0;

            c.drawImage(
                hitCircleGraphic[hitCircleFrame],
                -hitCircleGraphic[hitCircleFrame].width / 2,
                -hitCircleGraphic[hitCircleFrame].height / 2
            );

            if (number !== null) {
                renderComboNumber(number, 0, 0, c);
            }

            c.drawImage(
                hitCircleOverlayGraphic[hitCircleOverlayFrame],
                -hitCircleOverlayGraphic[hitCircleOverlayFrame].width / 2,
                -hitCircleOverlayGraphic[hitCircleOverlayFrame].height / 2
            );
        }

        function renderHitCircleObject(object) {
            var el = dom.get(object, function () {
                var hitCircleGraphic = getShadedGraphic(
                    skin, 'hitcircle',
                    shaders.multiplyByColor, object.combo.color
                );
                var hitCircleFrame = 0;

                var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay', 'image-set');
                var hitCircleOverlayFrame = 0;

                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.width = Math.max(
                    hitCircleGraphic[hitCircleFrame].width,
                    hitCircleOverlayGraphic[hitCircleOverlayFrame].width
                );
                canvas.height = Math.max(
                    hitCircleGraphic[hitCircleFrame].height,
                    hitCircleOverlayGraphic[hitCircleOverlayFrame].height
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

            var scale = ruleSet.getCircleSize() / 128;
            var alpha = ruleSet.getObjectOpacity(object, time);
            var width = getCoord(el.width * scale);
            var height = getCoord(el.height * scale);
            var x = getCoord(object.x - width / 2);
            var y = getCoord(object.y - height / 2);

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.width = width + 'px';
            el.style.height = height + 'px';
            el.style.opacity = alpha;

            setZ(el);

            renderApproachProgress(object, alpha);
        }

        function renderHitMarkerObject(object) {
            var graphicName = ruleSet.getHitMarkerImageName(object);
            if (!graphicName) {
                return;
            }

            var hitMarkerGraphic = skin.assetManager.get(graphicName, 'image-set');
            var hitMarkerFrame = 0;

            var graphic = hitMarkerGraphic[hitMarkerFrame];

            var el = dom.get(object, function () {
                return cloneAbsolute(graphic);
            });

            var scale = ruleSet.getHitMarkerScale(object, time);
            var width = getCoord(graphic.width * scale);
            var height = getCoord(graphic.height * scale);
            var x = getCoord(object.hitObject.x - width / 2);
            var y = getCoord(object.hitObject.y - height / 2);
            var alpha = ruleSet.getObjectOpacity(object, time);

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.width = width + 'px';
            el.style.height = height + 'px';
            el.style.opacity = alpha;

            setZ(el);
        }

        function renderSliderTrack(points, color, c) {
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
            var sliderBallGraphic = skin.assetManager.get('sliderb0', 'image-set');
            var sliderBallFrame = 0;

            var graphic = sliderBallGraphic[sliderBallFrame];

            var el = dom.get([ 'slider-ball', object ], function () {
                return cloneAbsolute(graphic);
            });

            var sliderBallPosition = object.curve.getSliderBallPosition(object, time, ruleSet);

            if (sliderBallPosition) {
                var scale = ruleSet.getCircleSize() / 128;
                var width = getCoord(graphic.width * scale);
                var height = getCoord(graphic.height * scale);
                var x = getCoord(sliderBallPosition[0] - width / 2);
                var y = getCoord(sliderBallPosition[1] - height / 2);

                var angle = Math.atan2(sliderBallPosition[4], sliderBallPosition[3]);
                var transform = 'rotate(' + angle + 'rad)';

                el.style.left = x + 'px';
                el.style.top = y + 'px';
                el.style.width = width + 'px';
                el.style.height = height + 'px';
                el.style.visibility = 'visible';

                // TODO More testing (I only have webkit and moz on L here)
                el.style.cssText += ';-moz-transform:' + transform + ';';
                el.style.webkitTransform = transform;
                el.style.transform = transform; // Let's get our hopes up

                setZ(el);
            } else {
                el.style.visibility = 'hidden';
            }
        }

        function renderSliderTick(object) {
            if (object.hitMarker) {
                return;
            }

            var sliderTickGraphic = skin.assetManager.get('sliderscorepoint', 'image-set');
            var sliderTickFrame = 0;

            var graphic = sliderTickGraphic[sliderTickFrame];

            var el = dom.get(object, function () {
                return cloneAbsolute(graphic);
            });

            var scale = ruleSet.getCircleSize() / 128;
            var width = getCoord(graphic.width * scale);
            var height = getCoord(graphic.height * scale);
            var x = getCoord(object.x - width / 2);
            var y = getCoord(object.y - height / 2);

            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.width = width + 'px';
            el.style.height = height + 'px';

            setZ(el);
        }

        function renderSliderObject(object) {
            var el = dom.get(object, function () {
                var canvas = document.createElement('canvas');
                canvas.style.position = 'absolute';
                canvas.style.left = '0px';
                canvas.style.top = '0px';
                canvas.width = 640;
                canvas.height = 480;

                var context = canvas.getContext('2d');

                renderSliderTrack(object.curve.points, object.combo.color, context);

                var scale = ruleSet.getCircleSize() / 128;

                var lastPoint = object.curve.points.slice(-1)[0];
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
                var reverseArrowGraphic = skin.assetManager.get('reversearrow', 'image-set');
                var reverseArrowFrame = 0;

                var rGraphic = reverseArrowGraphic[reverseArrowFrame];

                var repeatArrowEl = dom.get([ 'repeat-arrow', object ], function () {
                    return cloneAbsolute(rGraphic);
                });

                var scale = ruleSet.getCircleSize() / 128;
                var width = getCoord(rGraphic.width * scale);
                var height = getCoord(rGraphic.height * scale);
                var x = getCoord(repeatArrow.x - width / 2);
                var y = getCoord(repeatArrow.y - height / 2);

                repeatArrowEl.style.left = x + 'px';
                repeatArrowEl.style.top = y + 'px';
                repeatArrowEl.style.width = width + 'px';
                repeatArrowEl.style.height = height + 'px';

                setZ(repeatArrowEl);
            }

            var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

            if (visibility === 'during') {
                renderSliderBall(object);
            }

            if (visibility === 'appearing') {
                renderApproachProgress(object, alpha);
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

        function getObjectsToRender() {
            // Visible objects
            var objects = mapState.getVisibleObjects(time);

            // Hit markers
            objects = objects.concat(
                mapState.timeline.getAllInTimeRange(time - 4000, time, MapState.HIT_MARKER_CREATION)
            );

            return ruleSet.getObjectsByZ(objects);
        }

        function renderMap() {
            view(View.map, function () {
                getObjectsToRender().forEach(function (object) {
                    renderObject(object);

                    gPubSub.publish('tick');
                });
            });

            // TODO Render cursor in another render step
            // (See cursor + trail rendering code in file history)
        }
        // Map rendering }}}

        // HUD rendering {{{
        function renderScore() {
            var digitCount = 7;
            var zeros = new Array(digitCount + 1).join('0');
            var score = scoreHistory.getDataAtTime(time) || 0;
            score = zeros + score;
            score = score.slice(-digitCount);

            renderCharactersImages(getStringImages('score-', skin.assetManager, score), 'score', {
                x: 640,
                y: 20,
                scale: .7,
                align: 'right',
                spacing: skin.scoreFontSpacing
            });
        }

        function renderCombo() {
            var combo = comboHistory.getDataAtTime(time) || 0;

            renderCharactersImages(getStringImages('score-', skin.assetManager, combo + 'x'), 'combo', {
                x: 0,
                y: 460,
                scale: .7,
                align: 'left',
                spacing: skin.scoreFontSpacing
            });
        }

        function renderAccuracy() {
            var accuracy = accuracyHistory.getDataAtTime(time) || 0;
            accuracy *= 100;
            accuracy = accuracy.toFixed(2);

            renderCharactersImages(getStringImages('score-', skin.assetManager, accuracy + '%'), 'accuracy', {
                x: 640,
                y: 45,
                scale: .4,
                align: 'right',
                spacing: skin.scoreFontSpacing
            });
        }

        function renderHud() {
            view(View.hud, function () {
                renderScore();
                renderCombo();
                renderAccuracy();
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

            el.style.x = viewport.x + 'px';
            el.style.y = viewport.y + 'px';
            el.style.width = viewport.width + 'px';
            el.style.height = viewport.height + 'px';
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
            var el = dom.get('ready-to-play', function () {
                var el = cloneAbsolute(skin.assetManager.get('ready-to-play', 'image-set')[0]);
                el.style.left = '0px';
                el.style.top = '0px';
                el.style.width = '640px';
                el.style.height = '480px';
                return el;
            });

            setZ(el);
        }
        // Ready-to-play rendering }}}

        return {
            vars: vars,
            consts: consts,
            renderMap: renderMap,
            renderHud: renderHud,
            renderStoryboard: renderStoryboard,
            renderLoading: renderLoading,
            renderReadyToPlay: renderReadyToPlay
        };
    }

    function CanvasRenderer() {
        var front = document.createElement('div');
        front.style.display = 'block';
        front.style.position = 'relative';
        var frontDom = new DOMAllocator(front);

        var container = document.createElement('div');
        container.style.display = 'block';
        container.style.position = 'relative';
        container.appendChild(front);

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

        var r = renderer();
        var viewport = { };

        function resize(width, height) {
            container.style.width = width + 'px';
            container.style.height = height + 'px';

            var rect = util.fitRectangle(width, height, 640, 480);

            viewport = {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: Math.min(width, rect.width),
                height: Math.min(height, rect.height)
            };
        }

        resize(640, 480);

        var skinInitd = false;

        function initSkin(skin) {
            if (skinInitd) {
                return;
            }

            var cursorGraphic = skin.assetManager.get('cursor', 'image-set');

            // FIXME Possible XSS?
            container.style.cursor = 'url("' + cursorGraphic[0].src + '") ' + Math.floor(cursorGraphic[0].width / 2) + ' ' + Math.floor(cursorGraphic[0].height / 2) + ', none';

            skinInitd = true;
        }

        r.consts({
            caches: caches,
            dom: frontDom,
            viewport: viewport
        });

        return {
            element: container,

            resize: resize,

            mouseToGame: function (x, y) {
                var playfieldX = (x - viewport.x) / viewport.width * 640;
                var playfieldY = (y - viewport.y) / viewport.height * 480;
                var mapCoords = View.map.playfieldToView(playfieldX, playfieldY);

                return {
                    x: mapCoords[0],
                    y: mapCoords[1]
                };
            },

            beginRender: function () {
                frontDom.begin();
            },

            endRender: function () {
                frontDom.end();
            },

            renderMap: function (state, time) {
                initSkin(state.skin, state.mapState.ruleSet);

                r.vars({
                    mapState: state.mapState,
                    ruleSet: state.mapState.ruleSet,
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
                    time: time
                });

                r.renderHud();
            },

            renderStoryboard: function (storyboard, assetManager, time) {
                r.vars({
                    assetManager: assetManager,
                    storyboard: storyboard,
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
            }
        };
    }

    return CanvasRenderer;
});
