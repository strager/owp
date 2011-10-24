define('gfx/WebGLRenderer', [ 'game/MapState', 'game/mapObject', 'util/Cache', 'util/util', 'loading', 'gfx/View', 'game/storyboardObject', 'game/Storyboard' ], function (MapState, mapObject, Cache, util, loadingImageSrc, View, storyboardObject, Storyboard) {
    function makeTexture(gl, image) {
        var texture = gl.createTexture();
        texture.image = image;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return texture;
    }

    function TextureCache(gl) {
        this.gl = gl;
        this.cache = new Cache();
    }

    TextureCache.prototype.get = function (name, assetManager) {
        var gl = this.gl;

        var image = name;
        if (assetManager) {
            image = assetManager.get(name, 'image');
        }

        return this.cache.get(image, function () {
            return makeTexture(gl, image);
        });
    };

    TextureCache.prototype.getMany = function (names, assetManager) {
        return names.map(function (name) {
            return this.get(name, assetManager);
        }, this);
    };

    function reportGLError(gl, error) {
        // Find the error name
        var key;

        for (key in gl) {
            // Include properties of prototype
            if (gl[key] === error) {
                throw new Error('GL error ' + key + ' (code ' + error + ')');
            }
        }

        // Couldn't find it; whatever
        throw new Error('GL error code ' + error);
    }

    function checkGLError(gl) {
        var error = gl.getError();

        if (error !== 0) {
            reportGLError(gl, error);
        }
    }

    function wrapGL(gl) {
        if (gl.orig) {
            return gl;
        }

        var wrapped = {
            orig: gl
        };

        function wrap(key) {
            return function () {
                var ret = gl[key].apply(gl, arguments);
                checkGLError(gl);
                return ret;
            };
        }

        var key;

        for (key in gl) {
            // Include properties of prototype
            if (typeof gl[key] === 'function') {
                wrapped[key] = wrap(key);
            } else {
                wrapped[key] = gl[key];
            }
        }

        return wrapped;
    }

    function renderer() {
        // Les constants
        var buffers, caches, misc, programs, textures;
        var gl, viewport;

        function consts(c) {
            buffers = c.buffers;
            caches = c.caches;
            gl = c.context;
            misc = c.misc;
            programs = c.programs;
            textures = c.textures;
            viewport = c.viewport;
        }

        // Les variables
        var ruleSet, skin, storyboard;
        var objects;
        var mouseHistory;
        var scoreHistory, comboHistory, accuracyHistory;
        var videoElement;
        var mapProgress;
        var breakiness;
        var storyboardKey, skinKey;
        var time;

        function vars(v) {
            accuracyHistory = v.accuracyHistory;
            comboHistory = v.comboHistory;
            mapProgress = v.mapProgress;
            mouseHistory = v.mouseHistory;
            objects = v.objects;
            ruleSet = v.ruleSet;
            scoreHistory = v.scoreHistory;
            skin = v.skin;
            storyboard = v.storyboard;
            time = v.time;
            videoElement = v.videoElement;
            storyboardKey = v.storyboardKey;
            skinKey = v.skinKey;
            breakiness = v.breakiness;
        }

        // Views {{{
        var currentView;

        function view(v, callback) {
            var oldView = currentView;
            currentView = v;
            callback();
            currentView = oldView;
        }
        // Views }}}

        // Render batch {{{
        var renderBatch = [ ];

        function adjustColour(x) {
            return x / 255;
        }

        var renderBatchFlushers = {
            clear: function flushClear(color) {
                gl.clearColor.apply(gl, color);
                gl.clear(gl.COLOR_BUFFER_BIT);
            },

            beginSprite: function flushBeginSprite() {
                gl.useProgram(programs.sprite);

                // Buffers
                // Same as objectTarget
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.sprite.attr.coord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(programs.sprite.attr.coord);
            },
            drawSprite: function flushDrawSprite(sprite) {
                // Uniforms
                gl.uniform2fv(programs.sprite.uni.view, sprite.view.mat);
                gl.uniform2f(programs.sprite.uni.position, sprite.x, sprite.y);
                gl.uniform4fv(programs.sprite.uni.color, sprite.color.map(adjustColour));
                gl.uniform1f(programs.sprite.uni.scale, sprite.scale);
                gl.uniform1f(programs.sprite.uni.rotation, sprite.rotation || 0);

                gl.uniform2f(programs.sprite.uni.size, sprite.texture.image.width, sprite.texture.image.height);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, sprite.texture);
                gl.uniform1i(programs.sprite.uni.sampler, 0);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            },
            endSprite: function flushEndSprite() {
                // Cleanup
                gl.disableVertexAttribArray(programs.sprite.attr.coord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            solidSprite: function flushSolidSprite(solidSprite) {
                gl.useProgram(programs.solidSprite);

                // Buffers
                // Same as sprite
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.solidSprite.attr.coord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(programs.solidSprite.attr.coord);

                // Uniforms
                gl.uniform2fv(programs.solidSprite.uni.view, solidSprite.view.mat);
                gl.uniform2f(programs.solidSprite.uni.position, solidSprite.x + solidSprite.width / 2, solidSprite.y + solidSprite.height / 2);
                gl.uniform4fv(programs.solidSprite.uni.color, solidSprite.color.map(adjustColour));
                gl.uniform2f(programs.solidSprite.uni.size, solidSprite.width, solidSprite.height);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Cleanup
                gl.disableVertexAttribArray(programs.solidSprite.attr.coord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            beginUnit: function flushBeginUnit() {
                gl.bindFramebuffer(gl.FRAMEBUFFER, misc.objectTarget.framebuffer);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                gl.viewport(0, 0, viewport.width, viewport.height);
            },
            endUnit: function flushEndUnit(unit) {
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                gl.useProgram(programs.objectTarget);

                // Buffers
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.objectTarget.attr.coord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(programs.objectTarget.attr.coord);

                // Uniforms
                var dirtyRect;
                if(unit.dirty) {
                    var topLeft = unit.view.viewToGlobal(unit.dirty[0], unit.dirty[1]);
                    dirtyRect = [
                        topLeft[0], topLeft[1],
                        unit.dirty[2], unit.dirty[3]
                    ];
                } else {
                    dirtyRect = [
                        0, 0,
                        misc.objectTarget.width, misc.objectTarget.height
                    ];
                }

                var dirtyRectTransform = [
                    dirtyRect[0] / 640, dirtyRect[1] / 480,
                    dirtyRect[2] / 640, dirtyRect[3] / 480
                ];

                gl.uniform2f(programs.objectTarget.uni.view, viewport.width, viewport.height);
                gl.uniform2f(programs.objectTarget.uni.size, misc.objectTarget.width, misc.objectTarget.height);
                gl.uniform1f(programs.objectTarget.uni.alpha, unit.alpha);
                gl.uniform4fv(programs.objectTarget.uni.dirtyRect, dirtyRectTransform);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, misc.objectTarget.texture);
                gl.uniform1i(programs.objectTarget.uni.sampler, 0);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Cleanup
                gl.disableVertexAttribArray(programs.objectTarget.attr.coord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            curve: function flushCurve(curve) {
                // Outer curve
                gl.useProgram(programs.curveOuter);

                // Buffers
                // Vertex and UV are interleaved
                var stride = 2 * 4 * 2;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.curves[curve.id]);
                gl.vertexAttribPointer(programs.curveOuter.attr.vertexCoord, 2, gl.FLOAT, false, stride, 0);
                gl.enableVertexAttribArray(programs.curveOuter.attr.vertexCoord);

                // Uniforms
                gl.uniform2fv(programs.curveOuter.uni.view, curve.view.mat);
                gl.uniform4fv(programs.curveOuter.uni.color, [ 1, 1, 1, 1 ]);

                // Draw
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, curve.vertexCount);

                // Cleanup
                gl.disableVertexAttribArray(programs.curveOuter.attr.textureCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                // Inner curve
                gl.useProgram(programs.curveInner);

                // Buffers
                // Vertex and UV are interleaved
                var stride = 2 * 4 * 2;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.curves[curve.id]);
                gl.vertexAttribPointer(programs.curveInner.attr.vertexCoord, 2, gl.FLOAT, false, stride, 0);
                gl.vertexAttribPointer(programs.curveInner.attr.textureCoord, 2, gl.FLOAT, false, stride, 2 * 4);
                gl.enableVertexAttribArray(programs.curveInner.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.curveInner.attr.textureCoord);

                // Uniforms
                gl.uniform2fv(programs.curveInner.uni.view, curve.view.mat);
                gl.uniform4fv(programs.curveInner.uni.color, curve.color.map(adjustColour));

                // Draw
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, curve.vertexCount);

                // Cleanup
                gl.disableVertexAttribArray(programs.curveInner.attr.textureCoord);
                gl.disableVertexAttribArray(programs.curveInner.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            loading: function flushLoading(loading) {
                gl.useProgram(programs.loading);

                // Buffers
                // Same as sprite
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.loading.attr.coord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(programs.loading.attr.coord);

                gl.uniform2f(programs.loading.uni.position, loading.x, loading.y);
                gl.uniform2f(programs.loading.uni.size, loading.width, loading.height);
                gl.uniform1f(programs.loading.uni.time, loading.time);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, loading.texture);
                gl.uniform1i(programs.loading.uni.sampler, 0);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Cleanup
                gl.disableVertexAttribArray(programs.loading.attr.coord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            viewport: function flushViewport(viewport) {
                // HACK HACK HACK
                gl.viewport(
                viewport.x, viewport.y,
                viewport.width, viewport.height
                );
            }
        };

        function flushRenderBatch() {
            renderBatch.forEach(function (batch) {
                renderBatchFlushers[batch[0]](batch[1]);
            });

            renderBatch = [ ];
        }

        function sprite(options) {
            options.view = currentView;
            var draw = [ 'drawSprite', options ];

            if (renderBatch.length && renderBatch[renderBatch.length - 1][0] === 'endSprite') {
                renderBatch.splice(-1, 0, draw);
            } else {
                renderBatch.push([ 'beginSprite', null ]);
                renderBatch.push(draw);
                renderBatch.push([ 'endSprite', null ]);
            }
        }

        function solidSprite(options) {
            options.view = currentView;
            renderBatch.push([ 'solidSprite', options ]);
        }

        function curve(options) {
            options.view = currentView;
            renderBatch.push([ 'curve', options ]);
        }

        function loading(options) {
            renderBatch.push([ 'loading', options ]);
        }

        function reset() {
            renderBatch = [ ];
        }

        function vp(viewport) {
            // HACK HACK HACK
            renderBatch.push([ 'viewport', viewport ]);
        }

        function clear(r, g, b, a) {
            // We're clearing the entire screen, and we are targeted at the
            // screen.  All previous draw commands were useless.
            renderBatch = [ [ 'clear', [ r, g, b, a ] ] ];
        }
        // Render batch }}}

        // Rendering helpers {{{
        var fontLUT = {
            '0': '0',
            '1': '1',
            '2': '2',
            '3': '3',
            '4': '4',
            '5': '5',
            '6': '6',
            '7': '7',
            '8': '8',
            '9': '9',
            '.': 'dot',
            ',': 'comma',
            '%': 'percent',
            'x': 'x'
        };

        function getCharacters(string) {
            return ('' + string).split('').map(function (c) {
                return fontLUT[c];
            });
        }

        function getStringTextures(font, string) {
            return getCharacters(string).map(function (c) {
                return textures.get(font + c + '.png', skinKey);
            });
        }

        function renderCharacters(textures, options) {
            var scale = options.scale || 1;
            var spacing = options.spacing || 0;

            var totalWidth = textures.reduce(function (acc, texture) {
                return acc + texture.image.width;
            }, 0);

            var maxHeight = textures.reduce(function (acc, texture) {
                return Math.max(acc, texture.image.height * scale);
            }, 0);

            totalWidth += spacing * (textures.length - 1);

            var alignX = 'alignX' in options ? options.alignX : 0.5;
            var alignY = 'alignY' in options ? options.alignY : 0.5;

            var xOffset = -totalWidth * alignX;
            var yOffset = maxHeight / 2 - maxHeight * alignY;

            var x = options.x || 0;
            var y = options.y || 0;

            textures.forEach(function (texture, i) {
                var width = texture.image.width;
                var ox = (xOffset + width / 2) * scale;

                sprite({
                    x: x + ox,
                    y: y + yOffset,
                    color: [ 255, 255, 255, 255 ],
                    scale: scale,
                    texture: texture
                });

                xOffset += width + spacing;
            });
        }
        // Rendering helpers }}}

        // Map rendering {{{
        function createSliderTrack(curve, radius) {
            var points = curve.flattenContourPoints(radius);

            var floats = points.reduce(function (acc, point) {
                return acc.concat([ point[0], point[1], point[2], 0 ]);
            }, [ ]);

            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floats), gl.STATIC_DRAW);

            return {
                vertexCount: points.length,
                buffer: buffer
            };
        }

        function renderApproachProgress(object) {
            var alpha = ruleSet.getApproachCircleOpacity(object, time);
            var color = object.combo.color.concat([ alpha * 255 ]);

            var progress = ruleSet.getObjectApproachProgress(object, time);
            var radius;
            if (progress > 0) {
                radius = 1 + (1 - progress) * 2;
            } else {
                radius = 1;
            }

            renderApproachCircle(radius, object.x, object.y, color);
        }

        function renderApproachCircle(radius, x, y, color) {
            var scale = radius * ruleSet.getCircleSize() / 128;

            sprite({
                x: x,
                y: y,
                color: color,
                scale: scale,
                texture: textures.get('approachcircle.png', skinKey)
            });
        }

        function renderComboNumber(number, x, y) {
            var texs = getStringTextures('default-', number);
            var scale = Math.pow(texs.length, -1 / 4) * 0.9;
            scale *= ruleSet.getCircleSize() / 128;

            return renderCharacters(texs, {
                x: x,
                y: y,
                scale: scale,
                spacing: skin.hitCircleFontSpacing,
                alignX: 0.5
            });
        }

        function renderSliderBall(object) {
            var sliderBallPosition = object.getSliderBallPosition(time, ruleSet);

            var scale = ruleSet.getCircleSize() / 128;

            sprite({
                x: sliderBallPosition[0],
                y: sliderBallPosition[1],
                color: [ 255, 255, 255, 255 ],
                scale: scale,
                texture: textures.get('sliderb0.png', skinKey)
            });
        }

        function renderSliderTick(tick) {
            if (!ruleSet.isHitObjectVisible(tick, time)) {
                return;
            }

            var scale = ruleSet.getCircleSize() / 128;

            sprite({
                x: tick.x,
                y: tick.y,
                color: [ 255, 255, 255, 255 ],
                scale: scale,
                texture: textures.get('sliderscorepoint.png', skinKey)
            });
        }

        function renderUnit(options, callback) {
            options = util.extend({
                dirty: null,
                alpha: 1,
                view: currentView
            }, options);

            // Optimize the common case of alpha === 1, where there's no point
            // in rendering to an FBO
            if (options.alpha >= 1) {
                callback();
                return;
            }

            renderBatch.push([ 'beginUnit', null ]);

            var callbackOptions = callback();
            util.extend(options, callbackOptions);

            renderBatch.push([ 'endUnit', options ]);
        }

        function renderSliderObject(object) {
            var alpha = ruleSet.getObjectOpacity(object, time);
            var bounds = ruleSet.getObjectBoundingRectangle(object);

            renderUnit({ alpha: alpha, dirty: bounds }, function () {
                var key = [ object, ruleSet, skin ];

                var c = caches.sliderTrack.get(key, function () {
                    var radius = ruleSet.getSliderTrackWidth();

                    var b = createSliderTrack(object.curve, radius);
                    var buffer = b.buffer;
                    buffers.curves.push(buffer);

                    return {
                        vertexCount: b.vertexCount,
                        buffer: buffer,
                        id: buffers.curves.length - 1
                    };
                });

                var color = object.combo.color;
                var scale = ruleSet.getCircleSize() / 128;
                //var growPercentage = ruleSet.getSliderGrowPercentage(object, time);
                var growPercentage = 1;

                curve({
                    id: c.id,
                    color: color.concat([ 255 ]),
                    vertexCount: Math.round(c.vertexCount * growPercentage)
                });

                object.ticks.forEach(renderSliderTick);

                var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

                // XXX!
                //var lastPoint = object.curve.render(growPercentage).slice(-1)[0];
                var lastPoint = object.curve.getEndPoint();

                if (lastPoint) {
                    // End
                    sprite({
                        x: lastPoint[0],
                        y: lastPoint[1],
                        color: color.concat([ 255 ]),
                        scale: scale,
                        texture: textures.get('hitcircle.png', skinKey)
                    });

                    sprite({
                        x: lastPoint[0],
                        y: lastPoint[1],
                        color: [ 255, 255, 255, 255 ],
                        scale: scale,
                        texture: textures.get('hitcircleoverlay.png', skinKey)
                    });
                }

                renderHitCircleBackground(object.x, object.y, color);

                if (ruleSet.isComboNumberVisible(object, time)) {
                    // Show combo number only if the slider hasn't yet been hit
                    renderComboNumber(object.comboIndex + 1, object.x, object.y);
                }

                renderHitCircleOverlay(object.x, object.y);

                // Next end (repeat arrow)
                var repeatArrow = object.ends.filter(function (end) {
                    return ruleSet.isHitObjectVisible(end, time) && !end.isFinal;
                })[0];

                if (repeatArrow) {
                    var repeatArrowX, repeatArrowY;

                    if (growPercentage === 1 || !lastPoint) {
                        repeatArrowX = repeatArrow.x;
                        repeatArrowY = repeatArrow.y;
                    } else {
                        // Repeat arrow follows snaking
                        repeatArrowX = lastPoint[0];
                        repeatArrowY = lastPoint[1];
                    }

                    sprite({
                        x: repeatArrowX,
                        y: repeatArrowY,
                        color: [ 255, 255, 255, 255 ],
                        scale: scale * ruleSet.getRepeatArrowScale(repeatArrow, time),
                        texture: textures.get('reversearrow.png', skinKey)
                    });
                }

                if (visibility === 'during') {
                    renderSliderBall(object);
                }
            });
        }

        function renderHitCircleBackground(x, y, color) {
            var scale = ruleSet.getCircleSize() / 128;

            sprite({
                x: x,
                y: y,
                color: color.concat([ 255 ]),
                scale: scale,
                texture: textures.get('hitcircle.png', skinKey)
            });
        }

        function renderHitCircleOverlay(x, y) {
            var scale = ruleSet.getCircleSize() / 128;

            sprite({
                x: x,
                y: y,
                color: [ 255, 255, 255, 255 ],
                scale: scale,
                texture: textures.get('hitcircleoverlay.png', skinKey)
            });
        }

        function renderHitCircleObject(object) {
            var alpha = ruleSet.getObjectOpacity(object, time);
            var bounds = ruleSet.getObjectBoundingRectangle(object);

            renderUnit({ alpha: alpha, dirty: bounds }, function () {
                renderHitCircleBackground(object.x, object.y, object.combo.color);

                if (ruleSet.isComboNumberVisible(object, time)) {
                    renderComboNumber(object.comboIndex + 1, object.x, object.y);
                }

                renderHitCircleOverlay(object.x, object.y);
            });
        }

        function renderHitMarkerObject(object) {
            var image = ruleSet.getHitMarkerImageName(object);
            if (!image) {
                return;
            }

            var scale = ruleSet.getHitMarkerScale(object, time);
            var alpha = ruleSet.getObjectOpacity(object, time);

            sprite({
                x: object.hitObject.x,
                y: object.hitObject.y,
                color: [ 255, 255, 255, alpha * 255 ],
                scale: scale,
                texture: textures.get(image, skinKey)
            });
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
                });

                sortedObjects.forEach(function (object) {
                    renderObjectApproachProgress(object);
                });
            });
        }
        // Map rendering }}}

        // Cursor rendering {{{
        function renderCursorHead(time) {
            var state = mouseHistory.getDataAtTime(time);
            if (!state) {
                return;
            }

            sprite({
                x: state.x,
                y: state.y,
                color: [ 255, 255, 255, 255 ],
                scale: ruleSet.getCursorScale(mouseHistory, time),
                texture: textures.get('cursor.png', skinKey)
            });
        }

        function renderCursor() {
            view(View.map, function () {
                renderCursorHead(time);
            });
        }
        // Cursor rendering }}}

        // HUD rendering {{{
        function renderScore() {
            var digitCount = 7;
            var zeros = new Array(digitCount + 1).join('0');
            var score = scoreHistory.getDataAtTime(time) || 0;
            score = zeros + score;
            score = score.slice(-digitCount);

            renderCharacters(getStringTextures('score-', score), {
                x: 640,
                y: 20,
                scale: 0.7,
                alignX: 1,
                spacing: skin.scoreFontSpacing
            });
        }

        function renderCombo() {
            var combo = comboHistory.getDataAtTime(time) || 0;

            renderCharacters(getStringTextures('score-', combo + 'x'), {
                x: 0,
                y: 460,
                scale: 0.7,
                alignX: 0,
                spacing: skin.scoreFontSpacing
            });
        }

        function renderAccuracy() {
            var accuracy = accuracyHistory.getDataAtTime(time) || 0;
            accuracy *= 100;
            accuracy = accuracy.toFixed(2);

            renderCharacters(getStringTextures('score-', accuracy + '%'), {
                x: 640,
                y: 45,
                scale: 0.4,
                alignX: 1,
                spacing: skin.scoreFontSpacing
            });
        }

        function mapProgressColour(progress) {
            var c = (progress * 32 + 192);
            return [ c, c, c, 255 ];
        }

        function renderHud() {
            var MAP_PROGRESS_HEIGHT = 6;

            var width;
            if (mapProgress >= 0) {
                width = 640 * mapProgress;
            } else {
                width = 640 * (1 + mapProgress);
            }

            view(View.hud, function () {
                renderScore();
                renderCombo();
                renderAccuracy();

                solidSprite({
                    x: 0,
                    y: 480 - MAP_PROGRESS_HEIGHT,
                    width: width,
                    height: MAP_PROGRESS_HEIGHT,
                    color: mapProgressColour(mapProgress)
                });
            });
        }
        // HUD rendering }}}

        // Storyboard rendering {{{
        function renderBackground() {
            reset();

            var bg = storyboard.getBackgroundFilename(time);
            if (!bg) {
                clear(1, 1, 1, 1);
                return;
            }

            var texture = textures.get(bg, storyboardKey);
            var backgroundImage = texture.image;

            // Render background twice: once for the widescreen effect, and
            // once for the actual playfield background.
            vp({
                x: 0,
                y: 0,
                width: viewport.x * 2 + viewport.width,
                height: viewport.y * 2 + viewport.height
            });
            var scale = util.fitRectangleScale(
                viewport.width,
                viewport.height,
                backgroundImage.width,
                backgroundImage.height
            );
            var brightness = 0.15;
            sprite({
                x: 320,
                y: 240,
                color: [ brightness * 255, brightness * 255, brightness * 255, 255 ],
                scale: scale,
                texture: texture
            });

            vp(viewport);
            scale = util.fitOuterRectangleScale(
                640,
                480,
                backgroundImage.width,
                backgroundImage.height
            );
            brightness = 1 - (1 - breakiness) / 6;
            sprite({
                x: 320,
                y: 240,
                color: [ brightness * 255, brightness * 255, brightness * 255, 255 ],
                scale: scale,
                texture: texture
            });
        }

        function renderStoryboardSprite(object) {
            var texture = textures.get(object.filename, storyboardKey);

            // TODO Alignment, scale x/y

            sprite({
                x: object.x,
                y: object.y,
                color: [ object.color[0], object.color[1], object.color[2], object.color[3] * object.alpha ],
                scale: object.scale,
                rotation: object.rotation,
                texture: texture
            });
        }

        function renderStoryboardObject(object) {
            if (object instanceof storyboardObject.Sprite) {
                renderStoryboardSprite(object);
            }

            // Ignore unknown objects
        }

        function renderStoryboard() {
            // Video rendering is more trouble than its worth right now.
            // Sorry.  =[
            /*
            if (videoElement) {
                videoElement.play();
                // This crashes Chrome...
                // TODO Account for offsets, speed changes, etc.
                // videoElement.currentTime = time * 1000;
                return; // No BG/SB
            }
            */

            view(View.storyboard, function () {
                renderBackground();

                var objects;

                objects = storyboard.getObjectsAtTime(time, Storyboard.BACKGROUND_LAYER);
                objects.forEach(renderStoryboardObject);

                objects = storyboard.getObjectsAtTime(time, Storyboard.FOREGROUND_LAYER);
                objects.forEach(renderStoryboardObject);
            });
        }
        // Storyboard rendering }}}

        // Loading rendering {{{
        function renderLoading(texture) {
            clear(0, 0, 0, 1);

            if (!texture) {
                return;
            }

            var size = 0.6;
            var rect = util.fitRectangle(size, size, texture.image.width, texture.image.height);

            var angle = time / 35000;
            angle = angle - Math.floor(angle);
            angle = angle * Math.PI * 4;
            angle = angle - Math.floor(angle);

            loading({
                x: rect.x / size,
                y: rect.y / size,
                width: rect.width,
                height: rect.height,
                time: angle,
                texture: texture
            });
        }
        // Loading rendering }}}

        // Ready-to-play rendering {{{
        function renderReadyToPlay() {
            view(View.global, function () {
                var texture = textures.get('ready-to-play.png', skinKey);

                sprite({
                    x: 320,
                    y: 240,
                    color: [ 255, 255, 255, 255 ],
                    scale: 1,
                    texture: texture
                });
            });
        }
        // Ready-to-play rendering }}}

        function renderColourOverlay(colour) {
            view(View.global, function () {
                solidSprite({
                    x: 0,
                    y: 0,
                    width: 640,
                    height: 480,
                    color: colour
                });
            });
        }

        // User interface {{{
        function renderUiControl(control) {
            if (control.image) {
                var texture = textures.get(control.image());

                // TODO Height scaling
                var scale = control.width() / texture.image.width;

                sprite({
                    x: control.centerX(),
                    y: control.centerY(),
                    color: [ 255, 255, 255, 255 ],
                    scale: scale,
                    texture: texture
                });
            }

            if (control.text) {
                var text = control.text();

                renderCharacters(getStringTextures('score-', text), {
                    x: control.x(),
                    y: control.y(),
                    scale: control.characterScale(),
                    alignX: control.alignX(),
                    alignY: control.alignY(),
                    spacing: skin.scoreFontSpacing
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
            renderColourOverlay: renderColourOverlay,
            renderCursor: renderCursor,
            renderUi: renderUi,
            flush: flushRenderBatch
        };
    }

    // Shaders {{{
    var spriteVertexShader, spriteFragmentShader;
    var objectTargetVertexShader, objectTargetFragmentShader;
    var curveInnerVertexShader, curveInnerFragmentShader;
    var curveOuterVertexShader, curveOuterFragmentShader;
    var solidSpriteVertexShader, solidSpriteFragmentShader;
    var loadingVertexShader, loadingFragmentShader;

    (function () {
        /*jshint white: false */

        spriteVertexShader = [
            'attribute vec2 aCoord;',

            'uniform vec2 uView;',
            'uniform vec2 uSize;',
            'uniform vec2 uPosition;',
            'uniform float uScale;',
            'uniform float uRotation;',

            'varying vec2 vTextureCoord;',

            'mat4 projection = mat4(',
                '2.0 / 640.0, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / 480.0, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'mat2 rotation = mat2(',
                'cos(uRotation), -sin(uRotation),',
                'sin(uRotation), cos(uRotation)',
            ');',

            'void main(void) {',
                'gl_Position = vec4((aCoord - vec2(0.5, 0.5)) * uSize * uScale * rotation + uView + uPosition, 0.0, 1.0) * projection;',
                'vTextureCoord = aCoord;',
            '}'
        ].join('\n');

        spriteFragmentShader = [
            'varying vec2 vTextureCoord;',

            'uniform sampler2D uSampler;',
            'uniform vec4 uColor;',

            'void main(void) {',
                'gl_FragColor = texture2D(uSampler, vTextureCoord.st) * uColor;',
            '}'
        ].join('\n');

        solidSpriteVertexShader = [
            'attribute vec2 aCoord;',

            'uniform vec2 uView;',
            'uniform vec2 uSize;',
            'uniform vec2 uPosition;',

            'mat4 projection = mat4(',
                '2.0 / 640.0, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / 480.0, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = vec4((aCoord - vec2(0.5, 0.5)) * uSize + uView + uPosition, 0.0, 1.0) * projection;',
            '}'
        ].join('\n');

        solidSpriteFragmentShader = [
            'uniform vec4 uColor;',

            'void main(void) {',
                'gl_FragColor = uColor;',
            '}'
        ].join('\n');

        objectTargetVertexShader = [
            'attribute vec2 aCoord;',

            'varying vec2 vTextureCoord;',

            // TODO Rename uView to something else
            'uniform vec2 uView;',
            'uniform vec2 uSize;',
            'uniform vec4 uDirtyRect;',

            'mat4 projection = mat4(',
                '2.0 / 1.0, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / 1.0, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                // FIXME Herp derp ugly
                'vec2 p = aCoord;',
                'vec2 mult = uDirtyRect.zw;',
                'vec2 add = uDirtyRect.xy;',
                'gl_Position = vec4(p * mult + add, 0.0, 1.0) * projection;',
                'vTextureCoord = (vec2(0.0, -(uView.y - uSize.y) / uView.y) + (aCoord * mult + add)) * uView / uSize * vec2(1.0, -1.0);',
            '}'
        ].join('\n');

        objectTargetFragmentShader = [
            'varying vec2 vTextureCoord;',

            'uniform sampler2D uSampler;',
            'uniform float uAlpha;',

            'vec4 color = vec4(1.0, 1.0, 1.0, uAlpha);',

            'void main(void) {',
                'gl_FragColor = texture2D(uSampler, vTextureCoord.st) * color;',
            '}'
        ].join('\n');

        curveInnerVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

            'uniform vec2 uView;',

            'varying vec2 vTextureCoord;',

            'mat4 projection = mat4(',
                '2.0 / 640.0, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / 480.0, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = (vec4(aVertexCoord, 0.0, 1.0) + vec4(uView, 0.0, 0.0)) * projection;',
                'vTextureCoord = aTextureCoord;',
            '}'
        ].join('\n');

        curveInnerFragmentShader = [
            'uniform vec4 uColor;',

            'varying vec2 vTextureCoord;',

            'vec4 getSliderColor(float t, vec4 baseColor) {',
                'vec4 u = abs(vec4(t));',
                'bvec4 z = greaterThan(u, vec4(0.85));',
                'vec4 grad = vec4((u.xyz + 1.5) / (1.0 + 1.5), 1.0) * baseColor;',
                'return mix(grad, vec4(0.0), vec4(z));',
            '}',

            'void main(void) {',
                'gl_FragColor = getSliderColor(vTextureCoord.x, uColor);',
            '}'
        ].join('\n');

        curveOuterVertexShader = [
            'attribute vec2 aVertexCoord;',

            'uniform vec2 uView;',

            'mat4 projection = mat4(',
                '2.0 / 640.0, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / 480.0, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = (vec4(aVertexCoord, 0.0, 1.0) + vec4(uView, 0.0, 0.0)) * projection;',
            '}'
        ].join('\n');

        curveOuterFragmentShader = [
            'uniform vec4 uColor;',

            'void main(void) {',
                'gl_FragColor = uColor;',
            '}'
        ].join('\n');

        loadingVertexShader = [
            'attribute vec2 aCoord;',

            'uniform vec2 uPosition;',
            'uniform vec2 uSize;',

            'varying vec2 vTextureCoord;',

            'mat4 projection = mat4(',
                '2.0 / 2.0, 0.0, 0.0,  0.0,',
                '0.0, -2.0 / 2.0, 0.0, 0.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = vec4((aCoord * 2.0 - vec2(1.0, 1.0)) * uSize + uPosition, 0.0, 1.0) * projection;',
                'vTextureCoord = aCoord;',
            '}'
        ].join('\n');

        loadingFragmentShader = [
            'varying vec2 vTextureCoord;',

            'uniform sampler2D uSampler;',
            'uniform float uTime;',

            'vec4 colorFade(vec2 coord) {',
                'float progress = sin(uTime) * 4.0 - 1.0;',
                'float intensity = 1.0 - clamp(abs(coord.s - progress) * 1.5, 0.0, 1.0);',
                'return vec4(intensity, intensity, intensity, 1.0);',
            '}',

            'void main(void) {',
                'gl_FragColor = texture2D(uSampler, vTextureCoord.st) * colorFade(vTextureCoord.st);',
            '}'
        ].join('\n');
    }());
    // Shaders }}}

    function WebGLRenderer() {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;

        var context;
        var contextOptions = { alpha: true };

        try {
            context = canvas.getContext('webgl', contextOptions);

            if (!context) {
                throw new Error();
            }
        } catch (e) {
            try {
                context = canvas.getContext('experimental-webgl', contextOptions);

                if (!context) {
                    throw new Error();
                }
            } catch (e) {
                throw new Error('WebGL not supported');
            }
        }

        var container = document.createElement('div');
        var videoElement = null;
        canvas.style.position = 'absolute';
        container.appendChild(canvas);

        var gl = context;

        if (DEBUG) {
            gl = wrapGL(gl);
        }

        var buffers = { };
        var programs = { };
        var textureCache = new TextureCache(gl);
        var misc = { };

        var caches = {
            // [ sliderObject, ruleSet, skin ] => curveId
            sliderTrack: new Cache()
        };

        function init() {
            /*jshint white: false */

            buffers.sprite = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                 0, 0,
                 1, 0,
                 0, 1,

                 1, 0,
                 1, 1,
                 0, 1
            ]), gl.STATIC_DRAW);

            buffers.curves = [ ];

            programs.sprite = createProgram(gl, spriteVertexShader, spriteFragmentShader);
            programs.sprite.attr = {
                coord: gl.getAttribLocation(programs.sprite, 'aCoord')
            };
            programs.sprite.uni = {
                sampler: gl.getUniformLocation(programs.sprite, 'uSampler'),
                view: gl.getUniformLocation(programs.sprite, 'uView'),
                size: gl.getUniformLocation(programs.sprite, 'uSize'),
                position: gl.getUniformLocation(programs.sprite, 'uPosition'),
                scale: gl.getUniformLocation(programs.sprite, 'uScale'),
                rotation: gl.getUniformLocation(programs.sprite, 'uRotation'),
                color: gl.getUniformLocation(programs.sprite, 'uColor')
            };

            programs.solidSprite = createProgram(gl, solidSpriteVertexShader, solidSpriteFragmentShader);
            programs.solidSprite.attr = {
                coord: gl.getAttribLocation(programs.solidSprite, 'aCoord')
            };
            programs.solidSprite.uni = {
                view: gl.getUniformLocation(programs.solidSprite, 'uView'),
                size: gl.getUniformLocation(programs.solidSprite, 'uSize'),
                position: gl.getUniformLocation(programs.solidSprite, 'uPosition'),
                scale: gl.getUniformLocation(programs.solidSprite, 'uScale'),
                color: gl.getUniformLocation(programs.solidSprite, 'uColor')
            };

            programs.objectTarget = createProgram(gl, objectTargetVertexShader, objectTargetFragmentShader);
            programs.objectTarget.attr = {
                coord: gl.getAttribLocation(programs.objectTarget, 'aCoord')
            };
            programs.objectTarget.uni = {
                sampler: gl.getUniformLocation(programs.objectTarget, 'uSampler'),
                view: gl.getUniformLocation(programs.objectTarget, 'uView'),
                size: gl.getUniformLocation(programs.objectTarget, 'uSize'),
                dirtyRect: gl.getUniformLocation(programs.objectTarget, 'uDirtyRect'),
                alpha: gl.getUniformLocation(programs.objectTarget, 'uAlpha')
            };

            programs.curveInner = createProgram(gl, curveInnerVertexShader, curveInnerFragmentShader);
            programs.curveInner.attr = {
                vertexCoord: gl.getAttribLocation(programs.curveInner, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.curveInner, 'aTextureCoord')
            };
            programs.curveInner.uni = {
                view: gl.getUniformLocation(programs.curveInner, 'uView'),
                color: gl.getUniformLocation(programs.curveInner, 'uColor')
            };

            programs.curveOuter = createProgram(gl, curveOuterVertexShader, curveOuterFragmentShader);
            programs.curveOuter.attr = {
                vertexCoord: gl.getAttribLocation(programs.curveOuter, 'aVertexCoord')
            };
            programs.curveOuter.uni = {
                view: gl.getUniformLocation(programs.curveOuter, 'uView'),
                color: gl.getUniformLocation(programs.curveOuter, 'uColor')
            };

            programs.loading = createProgram(gl, loadingVertexShader, loadingFragmentShader);
            programs.loading.attr = {
                coord: gl.getAttribLocation(programs.loading, 'aCoord')
            };
            programs.loading.uni = {
                sampler: gl.getUniformLocation(programs.loading, 'uSampler'),
                position: gl.getUniformLocation(programs.loading, 'uPosition'),
                size: gl.getUniformLocation(programs.loading, 'uSize'),
                time: gl.getUniformLocation(programs.loading, 'uTime')
            };

            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);

            resize(640, 480);
        }

        function nextPot(v) {
            // http://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
            v--;
            v |= v >> 1;
            v |= v >> 2;
            v |= v >> 4;
            v |= v >> 8;
            v |= v >> 16;
            v++;
            return v;
        }

        function initObjectTarget() {
            if (misc.objectTarget) {
                if (misc.objectTarget.width  === viewport.nwidth
                 && misc.objectTarget.height === viewport.nheight) {
                    return;
                }

                gl.deleteFramebuffer(misc.objectTarget.framebuffer);
                gl.deleteTexture(misc.objectTarget.texture);
            }

            misc.objectTarget = {
                width: viewport.nwidth,
                height: viewport.nheight,
                framebuffer: gl.createFramebuffer(),
                texture: gl.createTexture()
            };

            gl.bindTexture(gl.TEXTURE_2D, misc.objectTarget.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, misc.objectTarget.width, misc.objectTarget.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.bindTexture(gl.TEXTURE_2D, null);

            gl.bindFramebuffer(gl.FRAMEBUFFER, misc.objectTarget.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, misc.objectTarget.texture, 0);

            var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                reportGLError(gl, status);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        var skinInitd = false;

        function initSkin(skin, ruleSet) {
            if (skinInitd) {
                return;
            }

            var skinKey = skin.assetManager;

            textureCache.getMany([
                'hitcircle.png',
                'hitcircleoverlay.png',
                'approachcircle.png',
                'sliderb0.png',
                'cursor.png',
                'cursortrail.png',
                'sliderscorepoint.png',
                'reversearrow.png',

                'default-comma.png',
                'default-dot.png',

                'score-comma.png',
                'score-dot.png',
                'score-percent.png',
                'score-x.png',

                'hit300.png',
                'hit100.png',
                'hit50.png',
                'sliderpoint30.png',
                'sliderpoint10.png',
                'hit0.png'
            ], skinKey);

            var i;
            for (i = 0; i < 10; ++i) {
                textureCache.get('default-' + i + '.png', skinKey);
                textureCache.get('score-' + i + '.png', skinKey);
            }

            skinInitd = true;
        }

        var storyboardInitd = false;

        function initStoryboard(storyboard, assetManager) {
            if (storyboardInitd) {
                return;
            }

            // TODO Preload stuff

            storyboardInitd = true;
        }

        var loadingInitd = false;
        var loadingTexture = null;

        function initLoading() {
            if (loadingInitd) {
                return;
            }

            var loadingImage = new Image();
            loadingImage.onload = function () {
                loadingTexture = makeTexture(gl, loadingImage);
            };
            loadingImage.src = loadingImageSrc;

            loadingInitd = true;
        }

        var readyToPlayInitd = false;

        function initReadyToPlay(skin) {
            if (readyToPlayInitd) {
                return;
            }

            var skinKey = skin.assetManager;

            textureCache.get('ready-to-play.png', skinKey);

            readyToPlayInitd = true;
        }

        var r = renderer();
        var viewport = { };

        function resize(width, height) {
            if (width <= 0 || height <= 0) {
                // Fuck that!
                return;
            }

            canvas.width = width;
            canvas.height = height;

            container.style.width  = width + 'px';
            container.style.height = height + 'px';

            var rect = util.fitRectangle(width, height, 640, 480);
            rect = util.roundRectangle(rect);

            var x = Math.max(0, rect.x);
            var y = Math.max(0, rect.y);
            var w = Math.min(width, rect.width);
            var h = Math.min(height, rect.height);

            viewport = {
                x: x,
                y: y,
                width: w,
                height: h,
                nwidth: nextPot(w),
                nheight: nextPot(h)
            };

            if (videoElement) {
                // TODO Resize video element
            }

            initObjectTarget();

            r.consts({
                buffers: buffers,
                caches: caches,
                context: context,
                misc: misc,
                programs: programs,
                textures: textureCache,
                viewport: viewport
            });
        }

        var oldCursorScale = null;

        init();

        return {
            element: container,
            animationElement: canvas,

            resize: resize,

            mouseToGame: function (x, y) {
                return {
                    x: (x - viewport.x) / viewport.width * 640,
                    y: (y - viewport.y) / viewport.height * 480
                };
            },

            beginRender: function () {
            },

            endRender: function () {
                gl.viewport(
                    viewport.x, viewport.y,
                    viewport.width, viewport.height
                );

                r.flush();
            },

            renderMap: function (state, time) {
                initSkin(state.skin, state.ruleSet);

                r.vars({
                    objects: state.objects,
                    ruleSet: state.ruleSet,
                    skin: state.skin,
                    mouseHistory: state.mouseHistory,
                    time: time,
                    skinKey: state.skin.assetManager
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
                    time: time,
                    skinKey: state.skin.assetManager
                });

                r.renderHud();
            },

            renderStoryboard: function (state, time) {
                initStoryboard(state.storyboard, state.assetManager);

                r.vars({
                    videoElement: videoElement,
                    storyboard: state.storyboard,
                    breakiness: state.breakiness,
                    time: time,
                    storyboardKey: state.assetManager
                });

                r.renderStoryboard();
            },

            renderLoading: function (time) {
                initLoading();

                r.vars({
                    time: time
                });

                r.renderLoading(loadingTexture);
            },

            renderReadyToPlay: function (skin, time) {
                initReadyToPlay(skin);

                r.vars({
                    skin: skin,
                    time: time,
                    skinKey: skin.assetManager
                });

                r.renderReadyToPlay();
            },

            renderCursor: function (state, time) {
                r.vars({
                    ruleSet: state.ruleSet,
                    skinKey: state.skin.assetManager,
                    mouseHistory: state.mouseHistory,
                    time: time
                });

                r.renderCursor();
            },

            renderCurrentCursor: function (state, time) {
                var MAX_CURSOR_IMAGE_SIZE = 128; // OS X can't handle more...

                var currentCursorScale = state.ruleSet.getCursorScale(state.mouseHistory, time);
                currentCursorScale *= viewport.width / 640;
                if (currentCursorScale !== oldCursorScale) {
                    var cursorImage = state.skin.assetManager.get('cursor.png', 'image');

                    var c = document.createElement('canvas');
                    c.width = Math.min(MAX_CURSOR_IMAGE_SIZE, cursorImage.width * currentCursorScale);
                    c.height = Math.min(MAX_CURSOR_IMAGE_SIZE, cursorImage.height * currentCursorScale);

                    var context = c.getContext('2d');
                    context.globalCompositeOperation = 'copy';
                    context.scale(currentCursorScale, currentCursorScale);
                    context.drawImage(cursorImage, 0, 0);

                    util.setCursorImage(canvas, c.toDataURL(), c.width / 2, c.height / 2);

                    oldCursorScale = currentCursorScale;
                }
            },

            renderColourOverlay: function (colour) {
                r.renderColourOverlay(colour);
            },

            renderUi: function (ui) {
                r.renderUi(ui);
            }
        };
    }

    var createProgram;

    (function () {
        /*jshint white: false, eqeqeq: false, eqnull: true */

        // Support methods
        // Taken from webgl-boilerplate, modified for owp
        // https://github.com/jaredwilli/webgl-boilerplate/
        function createShader( gl, src, type ) {

            var shader = gl.createShader( type );

            gl.shaderSource( shader, src );
            gl.compileShader( shader );

            if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {

                throw new Error( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) + "\nSOURCE:\n" + src );

            }

            return shader;

        }

        createProgram = function createProgram( gl, vertex, fragment ) {

            var program = gl.createProgram();

            var vs = createShader( gl, vertex, gl.VERTEX_SHADER );
            var fs = createShader( gl, '#ifdef GL_ES\nprecision highp float;\n#endif\n\n' + fragment, gl.FRAGMENT_SHADER );

            if ( vs == null || fs == null ) return null;

            gl.attachShader( program, vs );
            gl.attachShader( program, fs );

            gl.deleteShader( vs );
            gl.deleteShader( fs );

            gl.linkProgram( program );

            if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

                throw new Error( "ERROR:\n" +
                "VALIDATE_STATUS: " + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + "\n" +
                "ERROR: " + gl.getError() + "\n\n" +
                "- Vertex Shader -\n" + vertex + "\n\n" +
                "- Fragment Shader -\n" + fragment );

            }

            return program;

        };
    }());

    return WebGLRenderer;
});
