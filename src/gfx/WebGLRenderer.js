define('gfx/WebGLRenderer', [ 'game/MapState', 'game/mapObject', 'util/gPubSub', 'util/Cache', 'util/util', 'loading', 'gfx/View' ], function (MapState, mapObject, gPubSub, Cache, util, loadingImageSrc, View) {
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
        var ruleSet, skin;
        var objects;
        var mouseHistory;
        var scoreHistory, comboHistory, accuracyHistory;
        var videoElement;
        var mapProgress;
        var breakiness;
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
            time = v.time;
            videoElement = v.videoElement;
            breakiness = v.breakiness;
        }

        // Render batch {{{
        var renderBatch = [ ];

        var renderBatchFlushers = {
            clear: function flushClear(color) {
                gl.clearColor.apply(gl, color);
                gl.clear(gl.COLOR_BUFFER_BIT);
            },

            beginSprite: function flushBeginSprite() {
                gl.useProgram(programs.sprite);

                // Buffers
                // Same as objectTarget
                var vertexOffset = 0;
                var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.sprite.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.vertexAttribPointer(programs.sprite.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
                gl.enableVertexAttribArray(programs.sprite.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.sprite.attr.textureCoord);
            },
            drawSprite: function flushDrawSprite(sprite) {
                // Uniforms
                gl.uniform2fv(programs.sprite.uni.view, sprite.view.mat);
                gl.uniform2f(programs.sprite.uni.position, sprite.x, sprite.y);
                gl.uniform4fv(programs.sprite.uni.color, sprite.color);
                gl.uniform1f(programs.sprite.uni.scale, sprite.scale);

                gl.uniform2f(programs.sprite.uni.size, sprite.texture.image.width, sprite.texture.image.height);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, sprite.texture);
                gl.uniform1i(programs.sprite.uni.sampler, 0);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            },
            endSprite: function flushEndSprite() {
                // Cleanup
                gl.disableVertexAttribArray(programs.sprite.attr.textureCoord);
                gl.disableVertexAttribArray(programs.sprite.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            solidSprite: function flushSolidSprite(solidSprite) {
                gl.useProgram(programs.solidSprite);

                // Buffers
                // Same as sprite
                var vertexOffset = 0;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.solidSprite.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.enableVertexAttribArray(programs.solidSprite.attr.vertexCoord);

                // Uniforms
                gl.uniform2fv(programs.solidSprite.uni.view, solidSprite.view.mat);
                gl.uniform2f(programs.solidSprite.uni.position, solidSprite.x + solidSprite.width / 2, solidSprite.y + solidSprite.height / 2);
                gl.uniform4fv(programs.solidSprite.uni.color, solidSprite.color);
                gl.uniform2f(programs.solidSprite.uni.size, solidSprite.width, solidSprite.height);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Cleanup
                gl.disableVertexAttribArray(programs.solidSprite.attr.textureCoord);
                gl.disableVertexAttribArray(programs.solidSprite.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            endSprite: function flushEndSprite() {
                // Cleanup
                gl.disableVertexAttribArray(programs.sprite.attr.textureCoord);
                gl.disableVertexAttribArray(programs.sprite.attr.vertexCoord);
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
                // Same as sprite
                var vertexOffset = 0;
                var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                //gl.vertexAttribPointer(programs.objectTarget.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.vertexAttribPointer(programs.objectTarget.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
                //gl.enableVertexAttribArray(programs.objectTarget.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.objectTarget.attr.textureCoord);

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
                gl.disableVertexAttribArray(programs.objectTarget.attr.textureCoord);
                //gl.disableVertexAttribArray(programs.objectTarget.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            curve: function flushCurve(curve) {
                gl.useProgram(programs.curve);

                // Buffers
                // Vertex and UV are interleaved
                var stride = 2 * 4 * 2;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.curves[curve.id]);
                gl.vertexAttribPointer(programs.curve.attr.vertexCoord, 2, gl.FLOAT, false, stride, 0);
                gl.vertexAttribPointer(programs.curve.attr.textureCoord, 2, gl.FLOAT, false, stride, 2 * 4);
                gl.enableVertexAttribArray(programs.curve.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.curve.attr.textureCoord);

                // Uniforms
                gl.uniform2fv(programs.curve.uni.view, curve.view.mat);
                gl.uniform4fv(programs.curve.uni.color, curve.color);

                // Draw
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, curve.vertexCount);

                // Cleanup
                gl.disableVertexAttribArray(programs.curve.attr.textureCoord);
                gl.disableVertexAttribArray(programs.curve.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
            },

            loading: function flushLoading(loading) {
                gl.useProgram(programs.loading);

                // Buffers
                // Same as sprite
                var vertexOffset = 0;
                var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.loading.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.vertexAttribPointer(programs.loading.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
                gl.enableVertexAttribArray(programs.loading.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.loading.attr.textureCoord);

                gl.uniform2f(programs.loading.uni.position, loading.x, loading.y);
                gl.uniform2f(programs.loading.uni.size, loading.width, loading.height);
                gl.uniform1f(programs.loading.uni.time, loading.time);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, loading.texture);
                gl.uniform1i(programs.loading.uni.sampler, 0);

                // Draw
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Cleanup
                gl.disableVertexAttribArray(programs.loading.attr.textureCoord);
                gl.disableVertexAttribArray(programs.loading.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                gl.useProgram(null);
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

            if (renderBatch[renderBatch.length - 1][0] === 'endSprite') {
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

        function clear(r, g, b, a) {
            // We're clearing the entire screen, and we are targeted at the
            // screen.  All previous draw commands were useless.
            renderBatch = [ [ 'clear', [ r, g, b, a ] ] ];
        }
        // Render batch }}}

        // Views {{{
        var currentView = null;

        function view(v, callback) {
            var oldView = currentView;
            currentView = v;
            callback();
            currentView = oldView;
        }
        // Views }}}

        // Rendering helpers {{{
        function getCharacters(string) {
            return ('' + string).split('');
        }

        function getStringTextures(font, string) {
            return getCharacters(string).map(function (c) {
                return font[c];
            });
        }

        function renderCharacters(textures, options) {
            var offset = 0;

            var scale = options.scale || 1;
            var spacing = options.spacing || 0;

            var totalWidth = textures.reduce(function (acc, texture) {
                return acc + texture.image.width;
            }, 0);

            totalWidth += spacing * (textures.length - 1);

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

            var x = options.x || 0;
            var y = options.y || 0;

            textures.forEach(function (texture, i) {
                var width = texture.image.width;
                var ox = (offset + width / 2) * scale;

                sprite({
                    x: x + ox,
                    y: y,
                    color: [ 255, 255, 255, 255 ],
                    scale: scale,
                    texture: texture
                });

                offset += width + spacing;
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
                texture:textures.approachCircle
            });
        }

        function renderComboNumber(number, x, y) {
            var texs = getStringTextures(textures.digits, number);
            var scale = Math.pow(texs.length, -1 / 4) * 0.9;
            scale *= ruleSet.getCircleSize() / 128;

            return renderCharacters(texs, {
                x: x,
                y: y,
                scale: scale,
                spacing: skin.hitCircleFontSpacing,
                align: 'center'
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
                texture: textures.sliderBall
            });
        }

        function renderSliderTick(tick) {
            if (tick.hitMarker) {
                return;
            }

            var scale = ruleSet.getCircleSize() / 128;

            sprite({
                x: tick.x,
                y: tick.y,
                color: [ 255, 255, 255, 255 ],
                scale: scale,
                texture: textures.sliderTick
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
                    var adjustmentScale = 128 / (128 - 10); // Don't ask...
                    var radius = ruleSet.getCircleSize() / adjustmentScale / 2;

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
                        texture: textures.hitCircle
                    });

                    sprite({
                        x: lastPoint[0],
                        y: lastPoint[1],
                        color: [ 255, 255, 255, 255 ],
                        scale: scale,
                        texture: textures.hitCircleOverlay
                    });
                }

                renderHitCircleBackground(object.x, object.y, color);

                if (!object.hitMarker || object.hitMarker.time >= time) {
                    // Show combo number only if the slider hasn't yet been hit
                    // TODO Fade out nicely
                    renderComboNumber(object.comboIndex + 1, object.x, object.y);
                }

                renderHitCircleOverlay(object.x, object.y);

                // Next end (repeat arrow)
                var repeatArrow = object.ends.filter(function (end) {
                    return !end.hitMarker && !end.isFinal;
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
                        texture: textures.repeatArrow
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
                texture: textures.hitCircle
            });
        }

        function renderHitCircleOverlay(x, y) {
            var scale = ruleSet.getCircleSize() / 128;

            sprite({
                x: x,
                y: y,
                color: [ 255, 255, 255, 255 ],
                scale: scale,
                texture: textures.hitCircleOverlay
            });
        }

        function renderHitCircleObject(object) {
            var alpha = ruleSet.getObjectOpacity(object, time)

            renderUnit({ alpha: alpha }, function () {
                renderHitCircleBackground(object.x, object.y, object.combo.color);
                renderComboNumber(object.comboIndex + 1, object.x, object.y);
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
                texture: textures.hitMarkers[image]
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

            sprite({
                x: state.x,
                y: state.y,
                color: [ 255, 255, 255, 255 ],
                scale: 1,
                texture: textures.cursor
            });
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
            score = zeros + score;
            score = score.slice(-digitCount);

            renderCharacters(getStringTextures(textures.scoreDigits, score), {
                x: 640,
                y: 20,
                scale: .7,
                align: 'right',
                spacing: skin.scoreFontSpacing
            });
        }

        function renderCombo() {
            var combo = comboHistory.getDataAtTime(time) || 0;

            renderCharacters(getStringTextures(textures.scoreDigits, combo + 'x'), {
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

            renderCharacters(getStringTextures(textures.scoreDigits, accuracy + '%'), {
                x: 640,
                y: 45,
                scale: .4,
                align: 'right',
                spacing: skin.scoreFontSpacing
            });
        }

        function mapProgressColour(progress) {
            var c = (progress * 32 + 192) / 255;
            return [ c, c, c, 1 ];
        }

        function renderHud() {
            var MAP_PROGRESS_HEIGHT = 6;

            view(View.hud, function () {
                renderScore();
                renderCombo();
                renderAccuracy();

                solidSprite({
                    x: 0,
                    y: 480 - MAP_PROGRESS_HEIGHT,
                    width: 640 * mapProgress,
                    height: MAP_PROGRESS_HEIGHT,
                    color: mapProgressColour(mapProgress)
                });
            });
        }
        // HUD rendering }}}

        // Storyboard rendering {{{
        function renderBackground() {
            clear(1, 1, 1, 1);

            if (!textures.background) {
                return;
            }

            // Background
            // TODO Get background texture at specific time
            var texture = textures.background;
            var backgroundImage = texture.image;

            var containerW = 640;
            var containerH = 480;
            var innerW = backgroundImage.width;
            var innerH = backgroundImage.height;

            var scale = util.fitOuterRectangleScale(containerW, containerH, innerW, innerH);

            var brightness = 1 - (1 - breakiness) * 0.125;

            sprite({
                x: 320,
                y: 240,
                color: [ brightness * 255, brightness * 255, brightness * 255, 255 ],
                scale: scale,
                texture: texture
            });
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

                // TODO Real storyboard stuff
            });
        }
        // Storyboard rendering }}}

        // Loading rendering {{{
        function renderLoading() {
            clear(0, 0, 0, 1);

            if (!textures.loading) {
                return;
            }

            var size = 0.6;
            var texture = textures.loading;
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
            view(View.storyboard, function () {
                var texture = textures.readyToPlay;

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

        return {
            vars: vars,
            consts: consts,
            renderMap: renderMap,
            renderHud: renderHud,
            renderStoryboard: renderStoryboard,
            renderLoading: renderLoading,
            renderReadyToPlay: renderReadyToPlay,
            renderCursor: renderCursor,
            flush: flushRenderBatch
        };
    }

    // Shaders {{{
    var spriteVertexShader, spriteFragmentShader;
    var objectTargetVertexShader, objectTargetFragmentShader;
    var curveVertexShader, curveFragmentShader;
    var loadingVertexShader, loadingFragmentShader;

    (function () {
        /*jshint white: false */

        spriteVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

            'uniform vec2 uView;',
            'uniform vec2 uSize;',
            'uniform vec2 uPosition;',
            'uniform float uScale;',

            'varying vec2 vTextureCoord;',

            'mat4 projection = mat4(',
                '2.0 / 640.0, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / 480.0, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = (vec4(aVertexCoord / 2.0, 0.0, 1.0) * vec4(uSize * uScale, 1.0, 1.0) + vec4(uView + uPosition, 0.0, 0.0)) * projection;',
                'vTextureCoord = aTextureCoord;',
            '}'
        ].join('\n');

        spriteFragmentShader = [
            'varying vec2 vTextureCoord;',

            'uniform sampler2D uSampler;',
            'uniform vec4 uColor;',

            'void main(void) {',
                'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * (vec4(uColor) / 255.0);',
            '}'
        ].join('\n');

        solidSpriteVertexShader = [
            'attribute vec2 aVertexCoord;',

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
                'gl_Position = (vec4(aVertexCoord / 2.0, 0.0, 1.0) * vec4(uSize, 1.0, 1.0) + vec4(uView + uPosition, 0.0, 0.0)) * projection;',
            '}'
        ].join('\n');

        solidSpriteFragmentShader = [
            'uniform vec4 uColor;',

            'void main(void) {',
                'gl_FragColor = uColor;',
            '}'
        ].join('\n');

        objectTargetVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

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
                'vec2 p = aTextureCoord;',
                'vec2 mult = uDirtyRect.zw;',
                'vec2 add = uDirtyRect.xy;',
                'gl_Position = vec4(p * mult + add, 0.0, 1.0) * projection;',
                'vTextureCoord = (vec2(0.0, -(uView.y - uSize.y) / uView.y) + (aTextureCoord * mult + add)) * uView / uSize * vec2(1.0, -1.0);',
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

        curveVertexShader = [
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

        curveFragmentShader = [
            'uniform vec4 uColor;',

            'varying vec2 vTextureCoord;',

            'vec4 getSliderColor(float t, vec4 baseColor) {',
                'float u = abs(t);',
                'float intensity = 1.0;',

                'if (u > 0.85) {',
                    'baseColor = vec4(1, 1, 1, 1);',
                '} else {',
                    'intensity = (u + 1.5) / (1.0 + 1.5);',
                '}',

                'return baseColor * vec4(intensity, intensity, intensity, 1.0);',
            '}',

            'void main(void) {',
                'gl_FragColor = getSliderColor(vTextureCoord.x, uColor / 255.0);',
            '}'
        ].join('\n');

        loadingVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

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
                'gl_Position = vec4(aVertexCoord * uSize + uPosition, 0.0, 1.0) * projection;',
                'vTextureCoord = aTextureCoord;',
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
        var textures = { };
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
                // Faces
                -1, -1,
                 1, -1,
                -1,  1,

                 1, -1,
                 1,  1,
                -1,  1,

                 // UV
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
                vertexCoord: gl.getAttribLocation(programs.sprite, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.sprite, 'aTextureCoord')
            };
            programs.sprite.uni = {
                sampler: gl.getUniformLocation(programs.sprite, 'uSampler'),
                view: gl.getUniformLocation(programs.sprite, 'uView'),
                size: gl.getUniformLocation(programs.sprite, 'uSize'),
                position: gl.getUniformLocation(programs.sprite, 'uPosition'),
                scale: gl.getUniformLocation(programs.sprite, 'uScale'),
                color: gl.getUniformLocation(programs.sprite, 'uColor')
            };

            programs.solidSprite = createProgram(gl, solidSpriteVertexShader, solidSpriteFragmentShader);
            programs.solidSprite.attr = {
                vertexCoord: gl.getAttribLocation(programs.solidSprite, 'aVertexCoord')
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
                vertexCoord: gl.getAttribLocation(programs.objectTarget, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.objectTarget, 'aTextureCoord')
            };
            programs.objectTarget.uni = {
                sampler: gl.getUniformLocation(programs.objectTarget, 'uSampler'),
                view: gl.getUniformLocation(programs.objectTarget, 'uView'),
                size: gl.getUniformLocation(programs.objectTarget, 'uSize'),
                dirtyRect: gl.getUniformLocation(programs.objectTarget, 'uDirtyRect'),
                alpha: gl.getUniformLocation(programs.objectTarget, 'uAlpha')
            };

            programs.curve = createProgram(gl, curveVertexShader, curveFragmentShader);
            programs.curve.attr = {
                vertexCoord: gl.getAttribLocation(programs.curve, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.curve, 'aTextureCoord')
            };
            programs.curve.uni = {
                view: gl.getUniformLocation(programs.curve, 'uView'),
                color: gl.getUniformLocation(programs.curve, 'uColor')
            };

            programs.loading = createProgram(gl, loadingVertexShader, loadingFragmentShader);
            programs.loading.attr = {
                vertexCoord: gl.getAttribLocation(programs.loading, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.loading, 'aTextureCoord')
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

        function makeTexture(image) {
            var texture = gl.createTexture();
            texture.image = image;

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            return texture;
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

            function makeSkinTexture(name) {
                return makeTexture(skin.assetManager.get(name, 'image'));
            }

            textures.hitCircle = makeSkinTexture('hitcircle.png');
            textures.hitCircleOverlay = makeSkinTexture('hitcircleoverlay.png');
            textures.approachCircle = makeSkinTexture('approachcircle.png');
            textures.sliderBall = makeSkinTexture('sliderb0.png');
            textures.cursor = makeSkinTexture('cursor.png');
            textures.cursorTrail = makeSkinTexture('cursortrail.png');
            textures.sliderTick = makeSkinTexture('sliderscorepoint.png');
            textures.repeatArrow = makeSkinTexture('reversearrow.png');

            var cursorImage = skin.assetManager.get('cursor.png', 'image');
            util.setCursorImage(canvas, cursorImage.src, cursorImage.width / 2, cursorImage.height / 2);

            var i;

            textures.digits = [ ];
            textures.scoreDigits = [ ];

            for (i = 0; i < 10; ++i) {
                textures.digits[i] = makeSkinTexture('default-' + i + '.png');
                textures.scoreDigits[i] = makeSkinTexture('score-' + i + '.png');
            }

            textures.digits[','] = makeSkinTexture('default-comma.png');
            textures.digits['.'] = makeSkinTexture('default-dot.png');

            textures.scoreDigits[','] = makeSkinTexture('score-comma.png');
            textures.scoreDigits['.'] = makeSkinTexture('score-dot.png');
            textures.scoreDigits['%'] = makeSkinTexture('score-percent.png');
            textures.scoreDigits['x'] = makeSkinTexture('score-x.png');

            var hitMarkerNames = [
                'hit300',
                'hit100',
                'hit50',
                'sliderpoint30',
                'sliderpoint10',
                'hit0'
            ];

            textures.hitMarkers = [ ];

            hitMarkerNames.forEach(function (name) {
                textures.hitMarkers[name + '.png'] = makeSkinTexture(name + '.png');
            });

            gl.bindTexture(gl.TEXTURE_2D, null);

            skinInitd = true;
        }

        var storyboardInitd = false;

        function initStoryboard(storyboard, assetManager) {
            if (storyboardInitd) {
                return;
            }

            // A bit of a HACK
            var background = storyboard.getBackground(0);
            if (background) {
                var backgroundGraphic = assetManager.get(background.fileName, 'image');
                textures.background = makeTexture(backgroundGraphic);
            }

            var video = storyboard.videos[0];
            if (video) {
                var v = assetManager.get(video.fileName, 'video');
                if (v) {
                    videoElement = v;
                    videoElement.style.position = 'absolute';
                    videoElement.volume = 0;
                    videoElement.pause();
                    container.insertBefore(videoElement, canvas);
                }
            }

            storyboardInitd = true;
        }

        var loadingInitd = false;

        function initLoading() {
            if (loadingInitd) {
                return;
            }

            var loadingTexture = new Image();
            loadingTexture.onload = function () {
                textures.loading = makeTexture(loadingTexture);
            };
            loadingTexture.src = loadingImageSrc;

            loadingInitd = true;
        }

        var readyToPlayInitd = false;

        function initReadyToPlay(skin) {
            if (readyToPlayInitd) {
                return;
            }

            textures.readyToPlay = makeTexture(skin.assetManager.get('ready-to-play.png', 'image'));

            readyToPlayInitd = true;
        }

        var r = renderer();
        var viewport = { };

        function resize(width, height) {
            canvas.width = width;
            canvas.height = height;

            container.style.width  = width + 'px';
            container.style.height = height + 'px';

            var rect = util.fitRectangle(width, height, 640, 480);
            rect = util.roundRectangle(rect);

            var x = Math.max(0, rect.x);
            var y = Math.max(0, rect.y);
            var width = Math.min(width, rect.width);
            var height = Math.min(height, rect.height);

            viewport = {
                x: x,
                y: y,
                width: width,
                height: height,
                nwidth: nextPot(width),
                nheight: nextPot(height)
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
                textures: textures,
                viewport: viewport
            });
        }

        init();

        return {
            element: container,
            animationElement: canvas,

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
                initStoryboard(state.storyboard, state.assetManager);

                r.vars({
                    videoElement: videoElement,
                    storyboard: state.storyboard,
                    breakiness: state.breakiness,
                    time: time
                });

                r.renderStoryboard();
            },

            renderLoading: function (time) {
                initLoading();

                r.vars({
                    time: time
                });

                r.renderLoading();
            },

            renderReadyToPlay: function (skin, time) {
                initReadyToPlay(skin);

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
