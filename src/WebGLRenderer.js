define('WebGLRenderer', [ 'MapState', 'mapObject', 'Util/gPubSub', 'Util/Cache', 'Util/util' ], function (MapState, mapObject, gPubSub, Cache, util) {
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

    function renderer(v) {
        // Les constants
        var buffers = v.buffers;
        var caches = v.caches;
        var gl = v.context;
        var misc = v.misc;
        var programs = v.programs;
        var textures = v.textures;
        var viewport = v.viewport;

        // Les variables
        var mapState, ruleSet, skin;
        var mouseHistory;
        var scoreHistory, comboHistory, accuracyHistory;
        var time;

        var inProgram = false;

        // Shader programs {{{
        function program(prog, init, uninit, callback) {
            if (inProgram) {
                throw new Error('Already in program');
            }

            inProgram = true;

            // TODO Optimize useProgram and init/uninit calls

            gl.useProgram(prog);

            init();
            callback();
            uninit();

            inProgram = false;
        }

        function sprite(callback) {
            function init() {
                // Same as objectTarget
                var vertexOffset = 0;
                var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.sprite.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.vertexAttribPointer(programs.sprite.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
                gl.enableVertexAttribArray(programs.sprite.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.sprite.attr.textureCoord);
            }

            function uninit() {
                gl.disableVertexAttribArray(programs.sprite.attr.textureCoord);
                gl.disableVertexAttribArray(programs.sprite.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }

            program(programs.sprite, init, uninit, function () {
                gl.uniform2f(programs.sprite.uni.playfield, 640, 480);

                callback(function draw(texture) {
                    if (typeof texture !== 'undefined') {
                        gl.uniform2f(programs.sprite.uni.size, texture.image.width, texture.image.height);

                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.uniform1i(programs.sprite.uni.sampler, 0);
                    }

                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                });
            });
        }

        function objectTarget(callback) {
            function init() {
                // Same as sprite
                var vertexOffset = 0;
                var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
                gl.vertexAttribPointer(programs.objectTarget.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.vertexAttribPointer(programs.objectTarget.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
                gl.enableVertexAttribArray(programs.objectTarget.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.objectTarget.attr.textureCoord);
            }

            function uninit() {
                gl.disableVertexAttribArray(programs.objectTarget.attr.textureCoord);
                gl.disableVertexAttribArray(programs.objectTarget.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }

            program(programs.objectTarget, init, uninit, function () {
                callback(function draw() {
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                });
            });
        }

        function curve(curveId, callback) {
            function init() {
                // Vertex and UV are interleaved
                var stride = 2 * 4 * 2;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.curves[curveId]);
                gl.vertexAttribPointer(programs.curve.attr.vertexCoord, 2, gl.FLOAT, false, stride, 0);
                gl.vertexAttribPointer(programs.curve.attr.textureCoord, 2, gl.FLOAT, false, stride, 2 * 4);
                gl.enableVertexAttribArray(programs.curve.attr.vertexCoord);
                gl.enableVertexAttribArray(programs.curve.attr.textureCoord);
            }

            function uninit() {
                gl.disableVertexAttribArray(programs.curve.attr.vertexCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }

            program(programs.curve, init, uninit, function () {
                gl.uniform2f(programs.curve.uni.playfield, 640, 480);

                callback(function draw(vertexCount) {
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
                });
            });
        }
        // Shader programs }}}

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

            sprite(function (draw) {
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.position, options.x || 0, options.y || 0);

                textures.forEach(function (texture, i) {
                    var width = texture.image.width;
                    var x = (offset + width / 2) * scale;
                    var y = 0;

                    gl.uniform1f(programs.sprite.uni.scale, scale);
                    gl.uniform2f(programs.sprite.uni.offset, x, y);

                    draw(texture);

                    offset += width + spacing;
                });
            });
        }

        function createSliderTrack(points, radius) {
            var data = [ ];

            function extrude(point) {
                // [ x, y, _, dx, dy ] => [ x1, y1, x2, y2 ]

                var x = point[0];
                var y = point[1];
                var dx = point[3];
                var dy = point[4];

                return [
                    x - dy * radius,
                    y + dx * radius,
                    x + dy * radius,
                    y - dx * radius
                ];
            }

            function mark(a) {
                /*jshint white: false */

                // Vertex, UV, vertex, UV
                data.push(a[0]); data.push(a[1]);
                data.push(0);    data.push(0);

                data.push(a[2]); data.push(a[3]);
                data.push(0);    data.push(1);
            }

            points.forEach(function (point) {
                mark(extrude(point));
            });

            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

            return {
                vertexCount: data.length / 4,
                buffer: buffer
            };
        }
        // Rendering helpers }}}

        // Map rendering {{{
        function renderApproachProgress(object) {
            var color = object.combo.color;

            var progress = ruleSet.getObjectApproachProgress(object, time);

            var radius;

            if (progress > 0) {
                radius = 1 + (1 - progress);
            } else {
                radius = 1 + (1 - (-progress)) / 4;
            }

            renderApproachCircle(radius, object.x, object.y, color);
        }

        function renderApproachCircle(radius, x, y, color) {
            var scale = radius * ruleSet.getCircleSize() / 128;

            sprite(function (draw) {
                gl.uniform4f(programs.sprite.uni.color, color[0], color[1], color[2], 255);
                gl.uniform2f(programs.sprite.uni.position, x, y);
                gl.uniform1f(programs.sprite.uni.scale, scale);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);

                draw(textures.approachCircle);
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
            var sliderBallPosition = object.curve.getSliderBallPosition(object, time, ruleSet);

            if (!sliderBallPosition) {
                return;
            }

            var scale = ruleSet.getCircleSize() / 128;

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, sliderBallPosition[0], sliderBallPosition[1]);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.sliderBall);
            });
        }

        function renderSliderTick(tick) {
            if (tick.hitMarker) {
                return;
            }

            var scale = ruleSet.getCircleSize() / 128;

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, tick.x, tick.y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.sliderTick);
            });
        }

        function renderUnit(callback) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, misc.objectTarget.framebuffer);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.viewport(0, 0, viewport.width, viewport.height);
            var options = callback();
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            objectTarget(function (draw) {
                var alpha = typeof options.alpha === 'undefined' ? 1 : options.alpha;

                gl.uniform2f(programs.objectTarget.uni.playfield, viewport.width, viewport.height);
                gl.uniform2f(programs.objectTarget.uni.size, misc.objectTarget.width, misc.objectTarget.height);
                gl.uniform1f(programs.objectTarget.uni.alpha, alpha);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, misc.objectTarget.texture);
                gl.uniform1i(programs.objectTarget.uni.sampler, 0);

                draw();
            });
        }

        function renderSliderObject(object) {
            renderUnit(function () {
                var key = [ object, mapState ];

                var c = caches.sliderTrack.get(key, function () {
                    var points = object.curve.points;

                    var adjustmentScale = 128 / (128 - 10); // Don't ask...

                    var b = createSliderTrack(points, ruleSet.getCircleSize() / adjustmentScale / 2);
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
                var growPercentage = ruleSet.getSliderGrowPercentage(object, time);

                curve(c.id, function (draw) {
                    gl.uniform4f(programs.curve.uni.color, color[0], color[1], color[2], 255);

                    draw(Math.round(c.vertexCount * growPercentage));
                });

                object.ticks.forEach(renderSliderTick);

                var visibility = ruleSet.getObjectVisibilityAtTime(object, time);

                var lastPoint = object.curve.render(growPercentage).slice(-1)[0];

                if (lastPoint) {
                    // End
                    sprite(function (draw) {
                        gl.uniform2f(programs.sprite.uni.position, lastPoint[0], lastPoint[1]);
                        gl.uniform4f(programs.sprite.uni.color, color[0], color[1], color[2], 255);
                        gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                        gl.uniform1f(programs.sprite.uni.scale, scale);

                        draw(textures.hitCircle);

                        gl.uniform2f(programs.sprite.uni.position, lastPoint[0], lastPoint[1]);
                        gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                        gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                        gl.uniform1f(programs.sprite.uni.scale, scale);

                        draw(textures.hitCircleOverlay);
                    });
                }

                renderHitCircleBackground(object.x, object.y, color);
                renderComboNumber(object.comboIndex + 1, object.x, object.y);
                renderHitCircleOverlay(object.x, object.y);

                // Next end (repeat arrow)
                // TODO Position properly when sliding
                var repeatArrow = object.ends.filter(function (end) {
                    return !end.hitMarker && !end.isFinal;
                })[0];

                if (repeatArrow) {
                    sprite(function (draw) {
                        gl.uniform2f(programs.sprite.uni.position, repeatArrow.x, repeatArrow.y);
                        gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                        gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                        gl.uniform1f(programs.sprite.uni.scale, scale);

                        draw(textures.repeatArrow);
                    });
                }

                if (visibility === 'during') {
                    renderSliderBall(object);
                }

                renderApproachProgress(object);

                return {
                    alpha: ruleSet.getObjectOpacity(object, time)
                };
            });
        }

        function renderHitCircleBackground(x, y, color) {
            var scale = ruleSet.getCircleSize() / 128;

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, x, y);
                gl.uniform4f(programs.sprite.uni.color, color[0], color[1], color[2], 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.hitCircle);
            });
        }

        function renderHitCircleOverlay(x, y) {
            var scale = ruleSet.getCircleSize() / 128;

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, x, y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.hitCircleOverlay);
            });
        }

        function renderHitCircleObject(object) {
            renderUnit(function () {
                renderHitCircleBackground(object.x, object.y, object.combo.color);
                renderComboNumber(object.comboIndex + 1, object.x, object.y);
                renderHitCircleOverlay(object.x, object.y);
                renderApproachProgress(object);

                return {
                    alpha: ruleSet.getObjectOpacity(object, time)
                };
            });
        }

        function renderHitMarkerObject(object) {
            var image = ruleSet.getHitMarkerImageName(object);
            if (!image) {
                return;
            }

            var scale = ruleSet.getHitMarkerScale(object, time);
            var alpha = ruleSet.getObjectOpacity(object, time);

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, object.hitObject.x, object.hitObject.y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, alpha * 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.hitMarkers[image]);
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

        function renderCursor(state) {
            if (!state) {
                return;
            }

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, state.x, state.y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, 1);

                draw(textures.cursor);
            });
        }

        function renderCursorTrail(state, alpha) {
            if (!state) {
                return;
            }

            sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, state.x, state.y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, alpha * 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, 1);

                draw(textures.cursorTrail);
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
            getObjectsToRender().forEach(function (object) {
                renderObject(object);

                gPubSub.publish('tick');
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

            renderCharacters(getStringTextures(textures.scoreDigits, score), {
                x: 570,
                y: 20,
                scale: .7,
                align: 'right',
                spacing: skin.scoreFontSpacing
            });
        }

        function renderCombo() {
            var combo = comboHistory.getDataAtTime(time) || 0;

            renderCharacters(getStringTextures(textures.scoreDigits, combo + 'x'), {
                x: 20,
                y: 450,
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
                x: 570,
                y: 45,
                scale: .4,
                align: 'right',
                spacing: skin.scoreFontSpacing
            });
        }

        function renderHud() {
            renderScore();
            renderCombo();
            renderAccuracy();
        }
        // HUD rendering }}}

        // Storyboard rendering {{{
        function renderBackground() {
            if (!textures.background) {
                return;
            }

            // Background
            sprite(function (draw) {
                // TODO Get background texture at specific time
                var texture = textures.background;
                var backgroundImage = texture.image;

                var containerW = 640;
                var containerH = 480;
                var innerW = backgroundImage.width;
                var innerH = backgroundImage.height;

                var scale = util.fitRectangleScale(containerW, containerH, innerW, innerH);

                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.position, 320, 240);
                gl.uniform1f(programs.sprite.uni.scale, scale);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);

                draw(texture);
            });
        }

        function renderStoryboard() {
            renderBackground();

            // TODO Real storyboard stuff
        }
        // Storyboard rendering }}}

        function vars(v) {
            accuracyHistory = v.accuracyHistory;
            comboHistory = v.comboHistory;
            mapState = v.mapState;
            mouseHistory = v.mouseHistory;
            ruleSet = v.ruleSet;
            scoreHistory = v.scoreHistory;
            skin = v.skin;
            time = v.time;
        }

        return {
            vars: vars,
            renderMap: renderMap,
            renderHud: renderHud,
            renderStoryboard: renderStoryboard
        };
    }

    // Shaders {{{
    var spriteVertexShader, spriteFragmentShader;
    var objectTargetVertexShader, objectTargetFragmentShader;
    var curveVertexShader, curveFragmentShader;

    (function () {
        /*jshint white: false */

        spriteVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

            'uniform vec2 uPlayfield;',
            'uniform vec2 uSize;',
            'uniform vec2 uPosition;',
            'uniform vec2 uOffset;',
            'uniform float uScale;',

            'varying vec2 vTextureCoord;',

            'mat4 projection = mat4(',
                '2.0 / uPlayfield.x, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / uPlayfield.y, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = (vec4(aVertexCoord / 2.0, 0.0, 1.0) * vec4(uSize * uScale, 1.0, 1.0) + vec4(uPosition + uOffset, 0.0, 0.0)) * projection;',
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

        objectTargetVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

            'varying vec2 vTextureCoord;',

            'uniform vec2 uPlayfield;',
            'uniform vec2 uSize;',

            'mat4 projection = mat4(',
                '2.0 / uPlayfield.x, 0.0, 0.0, -1.0,',
                '0.0, 2.0 / uPlayfield.y, 0.0, -1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = (vec4(aVertexCoord / 2.0, 0.0, 1.0) + vec4(0.5, 0.5, 0.0, 0.0)) * vec4(uSize, 1.0, 1.0) * projection;',
                'vTextureCoord = aTextureCoord;',
            '}'
        ].join('\n');

        objectTargetFragmentShader = [
            'varying vec2 vTextureCoord;',

            'uniform sampler2D uSampler;',
            'uniform float uAlpha;',

            'vec4 color = vec4(1.0, 1.0, 1.0, uAlpha);',

            'void main(void) {',
                'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * color;',
            '}'
        ].join('\n');

        curveVertexShader = [
            'attribute vec2 aVertexCoord;',
            'attribute vec2 aTextureCoord;',

            'uniform vec2 uPlayfield;',

            'varying vec2 vTextureCoord;',

            'mat4 projection = mat4(',
                '2.0 / uPlayfield.x, 0.0, 0.0, -1.0,',
                '0.0, -2.0 / uPlayfield.y, 0.0, 1.0,',
                '0.0, 0.0,-2.0,-0.0,',
                '0.0, 0.0, 0.0, 1.0',
            ');',

            'void main(void) {',
                'gl_Position = vec4(aVertexCoord, 0.0, 1.0) * projection;',
                'vTextureCoord = aTextureCoord;',
            '}'
        ].join('\n');

        curveFragmentShader = [
            'uniform vec4 uColor;',

            'varying vec2 vTextureCoord;',

            'vec4 getSliderColor(float t, vec4 baseColor) {',
                'float u = abs(t - 0.5) / 0.5;',
                'float intensity = 1.0;',

                'if (u > 0.85) {',
                    'baseColor = vec4(1, 1, 1, 1);',
                '} else {',
                    'intensity = (u + 1.5) / (1.0 + 1.5);',
                '}',

                'return baseColor * vec4(intensity, intensity, intensity, 1.0);',
            '}',

            'void main(void) {',
                'gl_FragColor = getSliderColor(vTextureCoord.t, vec4(uColor) / 255.0);',
            '}'
        ].join('\n');
    }());
    // Shaders }}}

    function WebGLRenderer() {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;

        var context;

        try {
            context = canvas.getContext('webgl');

            if (!context) {
                throw new Error();
            }
        } catch (e) {
            try {
                context = canvas.getContext('experimental-webgl');

                if (!context) {
                    throw new Error();
                }
            } catch (e) {
                throw new Error('WebGL not supported');
            }
        }

        var gl = context;

        if (DEBUG) {
            gl = wrapGL(gl);
        }

        var buffers = { };
        var programs = { };
        var textures = { };
        var misc = { };

        var caches = {
            // [ sliderObject, mapState, skin ] => curveId
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
                playfield: gl.getUniformLocation(programs.sprite, 'uPlayfield'),
                size: gl.getUniformLocation(programs.sprite, 'uSize'),
                position: gl.getUniformLocation(programs.sprite, 'uPosition'),
                offset: gl.getUniformLocation(programs.sprite, 'uOffset'),
                scale: gl.getUniformLocation(programs.sprite, 'uScale'),
                color: gl.getUniformLocation(programs.sprite, 'uColor')
            };

            programs.objectTarget = createProgram(gl, objectTargetVertexShader, objectTargetFragmentShader);
            programs.objectTarget.attr = {
                vertexCoord: gl.getAttribLocation(programs.objectTarget, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.objectTarget, 'aTextureCoord')
            };
            programs.objectTarget.uni = {
                sampler: gl.getUniformLocation(programs.objectTarget, 'uSampler'),
                playfield: gl.getUniformLocation(programs.objectTarget, 'uPlayfield'),
                size: gl.getUniformLocation(programs.objectTarget, 'uSize'),
                alpha: gl.getUniformLocation(programs.objectTarget, 'uAlpha')
            };

            programs.curve = createProgram(gl, curveVertexShader, curveFragmentShader);
            programs.curve.attr = {
                vertexCoord: gl.getAttribLocation(programs.curve, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.sprite, 'aTextureCoord')
            };
            programs.curve.uni = {
                playfield: gl.getUniformLocation(programs.curve, 'uPlayfield'),
                color: gl.getUniformLocation(programs.curve, 'uColor')
            };

            gl.enable(gl.BLEND);
            gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);

            misc.objectTarget = {
                width: 1024,  // XXX TEMPORARY XXX
                height: 1024, // XXX TEMPORARY XXX
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

        var skinInitd = false;

        function initSkin(skin, ruleSet) {
            if (skinInitd) {
                return;
            }

            function makeSkinTexture(name) {
                return makeTexture(skin.assetManager.get(name, 'image-set')[0]);
            }

            textures.hitCircle = makeSkinTexture('hitcircle');
            textures.hitCircleOverlay = makeSkinTexture('hitcircleoverlay');
            textures.approachCircle = makeSkinTexture('approachcircle');
            textures.sliderBall = makeSkinTexture('sliderb0');
            textures.cursor = makeSkinTexture('cursor');
            textures.cursorTrail = makeSkinTexture('cursortrail');
            textures.sliderTick = makeSkinTexture('sliderscorepoint');
            textures.repeatArrow = makeSkinTexture('reversearrow');

            // FIXME Possible XSS?
            var cursorImage = skin.assetManager.get('cursor', 'image-set')[0];
            canvas.style.cursor = 'url("' + cursorImage.src + '") ' + Math.floor(cursorImage.width / 2) + ' ' + Math.floor(cursorImage.height / 2) + ', none';

            var i;

            textures.digits = [ ];
            textures.scoreDigits = [ ];

            for (i = 0; i < 10; ++i) {
                textures.digits[i] = makeSkinTexture('default-' + i);
                textures.scoreDigits[i] = makeSkinTexture('score-' + i);
            }

            textures.digits[','] = makeSkinTexture('default-comma');
            textures.digits['.'] = makeSkinTexture('default-dot');

            textures.scoreDigits[','] = makeSkinTexture('score-comma');
            textures.scoreDigits['.'] = makeSkinTexture('score-dot');
            textures.scoreDigits['%'] = makeSkinTexture('score-percent');
            textures.scoreDigits['x'] = makeSkinTexture('score-x');

            var hitMarkerImageNames = [
                'hit300',
                'hit100',
                'hit50',
                'sliderpoint30',
                'sliderpoint10',
                'hit0'
            ];

            textures.hitMarkers = [ ];

            hitMarkerImageNames.forEach(function (imageName) {
                textures.hitMarkers[imageName] = makeSkinTexture(imageName);
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

            storyboardInitd = true;
        }

        var viewport = { };

        init();

        function resize(width, height) {
            canvas.width = width;
            canvas.height = height;

            var rect = util.fitRectangle(width, height, 640, 480);

            viewport = {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: Math.min(width, rect.width),
                height: Math.min(height, rect.height)
            };
        }

        var r = renderer({
            buffers: buffers,
            caches: caches,
            context: context,
            misc: misc,
            programs: programs,
            textures: textures,
            viewport: viewport
        });

        return {
            element: canvas,

            resize: resize,

            mouseToGame: function (x, y) {
                return {
                    x: (x - viewport.x) / viewport.width * 640,
                    y: (y - viewport.y) / viewport.height * 480
                };
            },

            beginRender: function () {
                gl.clear(gl.COLOR_BUFFER_BIT);

                gl.viewport(
                    viewport.x, viewport.y,
                    viewport.width, viewport.height
                );
            },

            endRender: function () {
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
                initStoryboard(storyboard, assetManager);

                r.vars({
                    storyboard: storyboard,
                    time: time
                });

                r.renderStoryboard();
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
