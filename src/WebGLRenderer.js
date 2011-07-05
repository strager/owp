define('WebGLRenderer', [ 'HitCircle', 'Slider', 'HitMarker', 'MapState', 'Util/gPubSub', 'Util/Cache' ], function (HitCircle, Slider, HitMarker, MapState, gPubSub, Cache) {
    var drawers = function (gl, buffers, programs) {
        var inProgram = false;

        function program (program, init, uninit, callback) {
            if (inProgram) {
                throw new Error('Already in program');
            }

            inProgram = true;

            // TODO Optimize useProgram and init/uninit calls

            gl.useProgram(program);

            init();
            callback();
            uninit();

            inProgram = false;
        }

        function initSprite () {
            var vertexOffset = 0;
            var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
            gl.vertexAttribPointer(programs.sprite.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
            gl.vertexAttribPointer(programs.sprite.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
            gl.enableVertexAttribArray(programs.sprite.attr.vertexCoord);
            gl.enableVertexAttribArray(programs.sprite.attr.textureCoord);
        }

        function uninitSprite () {
            gl.disableVertexAttribArray(programs.sprite.attr.textureCoord);
            gl.disableVertexAttribArray(programs.sprite.attr.vertexCoord);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        function sprite(callback) {
            program(programs.sprite, initSprite, uninitSprite, function () {
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

        function curve(curveId, callback) {
            function init() {
                var vertexOffset = 0;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.curves[curveId]);
                gl.vertexAttribPointer(programs.curve.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
                gl.enableVertexAttribArray(programs.curve.attr.vertexCoord);
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

        return {
            program: program,
            sprite: sprite,
            curve: curve
        };
    };

    var renderMap = function (vars) {
        var mapState = vars.mapState;
        var ruleSet = mapState.ruleSet;
        var skin = vars.skin;
        var time = vars.time;
        var gl = vars.context;
        var buffers = vars.buffers;
        var programs = vars.programs;
        var textures = vars.textures;
        var caches = vars.caches;

        var draw = drawers(gl, buffers, programs);

        // TODO Real work

        var getDigits = function (number) {
            return ('' + number).split('');
        };

        var getNumberTextures = function (number) {
            return getDigits(number).map(function (digit) {
                return textures.digits[digit];
            });
        };

        var createSliderTrack = function (points, radius) {
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
                data.push(a[0]); data.push(a[1]);
                data.push(a[2]); data.push(a[3]);
            }

            points.forEach(function (point) {
                mark(extrude(point));
            });

            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

            return {
                vertexCount: data.length / 2,
                buffer: buffer
            };
        };

        var renderApproachCircle = function (progress, x, y, color, alpha) {
            var radius = 1;

            if (progress > 0) {
                radius += (1 - progress);
            } else {
                radius += (1 - (-progress)) / 4;
            }

            radius *= ruleSet.getCircleSize() / 128;

            draw.sprite(function (draw) {
                gl.uniform4f(programs.sprite.uni.color, color[0], color[1], color[2], color[3]);
                gl.uniform2f(programs.sprite.uni.position, x, y);
                gl.uniform1f(programs.sprite.uni.scale, radius);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);

                draw(textures.approachCircle);
            });
        };

        var renderComboNumber = function (number, x, y) {
            var textures = getNumberTextures(number);
            var spacing = skin.hitCircleFontSpacing;

            if (textures.length === 0) {
                // No textures?  Don't render anything.
                return;
            }

            var totalWidth = textures.reduce(function (acc, texture) {
                return acc + texture.image.width;
            }, 0);

            totalWidth += spacing * (textures.length - 1);

            var scale = Math.pow(textures.length, -1 / 4) * 0.9;
            scale *= ruleSet.getCircleSize() / 128;
            var offset = -totalWidth / 2;

            draw.sprite(function (draw) {
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.position, x, y);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                textures.forEach(function (texture) {
                    var width = texture.image.width;
                    var x = (offset + width / 2) * scale;
                    var y = 0;

                    gl.uniform2f(programs.sprite.uni.offset, x, y);

                    draw(texture);

                    offset += width + spacing;
                });
            });
        };

        var renderSliderObject = function (object) {
            var key = [ object, mapState ];

            var c = caches.sliderTrack.get(key, function () {
                var points = object.curve.points;

                var b = createSliderTrack(points, ruleSet.getCircleSize() / 2);
                var buffer = b.buffer;
                buffers.curves.push(buffer);

                return {
                    vertexCount: b.vertexCount,
                    buffer: buffer,
                    id: buffers.curves.length - 1
                };
            });

            var alpha = 1;
            var color = object.combo.color.concat([ alpha * 255 ]);
            var growPercentage = ruleSet.getSliderGrowPercentage(object, time);

            draw.curve(c.id, function (draw) {
                gl.uniform4f(programs.curve.uni.color, color[0], color[1], color[2], color[3]);

                draw(Math.round(c.vertexCount * growPercentage));
            });

            renderHitCircleObject(object);
        };

        var renderHitCircleObject = function (object) {
            // We disable alpha blending because shit looks ugly otherwise
            // (because each face is blended, not the entire object together).
            // Will need to fix this sometime...
            //var alpha = ruleSet.getObjectOpacity(object, time);
            var alpha = 1;
            var color = object.combo.color.concat([ alpha * 255 ]);

            var scale = ruleSet.getCircleSize() / 128;

            // Hit circle background
            draw.sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, object.x, object.y);
                gl.uniform4f(programs.sprite.uni.color, color[0], color[1], color[2], color[3]);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.hitCircle);
            });

            // Numbering
            renderComboNumber(object.comboIndex + 1, object.x, object.y);

            // Hit circle overlay
            draw.sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, object.x, object.y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.hitCircleOverlay);
            });

            var approachProgress = ruleSet.getObjectApproachProgress(object, time);
            renderApproachCircle(approachProgress, object.x, object.y, color);
        };

        var renderHitMarkerObject = function (object) {
            var scale = ruleSet.getHitMarkerScale(object, time);

            draw.sprite(function (draw) {
                gl.uniform2f(programs.sprite.uni.position, object.hitObject.x, object.hitObject.y);
                gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                gl.uniform2f(programs.sprite.uni.offset, 0, 0);
                gl.uniform1f(programs.sprite.uni.scale, scale);

                draw(textures.hitMarkers[object.score]);
            });
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

            gPubSub.publish('tick');
        });
    };

    var spriteVertexShader = [
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

    var spriteFragmentShader = [
        'varying vec2 vTextureCoord;',

        'uniform sampler2D uSampler;',
        'uniform vec4 uColor;',

        'void main(void) {',
            'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * (vec4(uColor) / 255.0);',
        '}'
    ].join('\n');

    var curveVertexShader = [
        'attribute vec2 aVertexCoord;',

        'uniform vec2 uPlayfield;',

        'mat4 projection = mat4(',
            '2.0 / uPlayfield.x, 0.0, 0.0, -1.0,',
            '0.0, -2.0 / uPlayfield.y, 0.0, 1.0,',
            '0.0, 0.0,-2.0,-0.0,',
            '0.0, 0.0, 0.0, 1.0',
        ');',

        'void main(void) {',
            'gl_Position = vec4(aVertexCoord, 0.0, 1.0) * projection;',
        '}'
    ].join('\n');

    var curveFragmentShader = [
        'uniform vec4 uColor;',

        'void main(void) {',
            'gl_FragColor = vec4(uColor) / 255.0;',
        '}'
    ].join('\n');

    var WebGLRenderer = function (context) {
        var gl = context;

        var buffers = { };
        var programs = { };
        var textures = { };

        var caches = {
            // [ sliderObject, mapState, skin ] => curveId
            sliderTrack: new Cache()
        };

        function init() {
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
                 0, 1,
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
                color: gl.getUniformLocation(programs.sprite, 'uColor'),
            };

            programs.curve = createProgram(gl, curveVertexShader, curveFragmentShader);
            programs.curve.attr = {
                vertexCoord: gl.getAttribLocation(programs.curve, 'aVertexCoord'),
            };
            programs.curve.uni = {
                playfield: gl.getUniformLocation(programs.curve, 'uPlayfield'),
                color: gl.getUniformLocation(programs.curve, 'uColor'),
            };

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);

            resize();
        };

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

        function initSkin(skin) {
            if (skinInitd) {
                return;
            }

            var hitCircleGraphic = skin.assetManager.get('hitcircle', 'image-set');
            var hitCircleOverlayGraphic = skin.assetManager.get('hitcircleoverlay', 'image-set');
            var approachCircleGraphic = skin.assetManager.get('approachcircle', 'image-set');

            textures.hitCircle = makeTexture(hitCircleGraphic[0]);
            textures.hitCircleOverlay = makeTexture(hitCircleOverlayGraphic[0]);
            textures.approachCircle = makeTexture(approachCircleGraphic[0]);

            var i;
            var graphic;

            textures.digits = [ ];

            for (i = 0; i < 10; ++i) {
                graphic = skin.assetManager.get('default-' + i, 'image-set');
                textures.digits[i] = makeTexture(graphic[0]);
            }

            var hitScores = [ 0, 50, 100, 300 ];

            textures.hitMarkers = [ ];

            for (i = 0; i < hitScores.length; ++i) {
                graphic = skin.assetManager.get('hit' + hitScores[i], 'image-set');
                textures.hitMarkers[hitScores[i]] = makeTexture(graphic[0]);
            }

            gl.bindTexture(gl.TEXTURE_2D, null);

            skinInitd = true;
        }

        var storyboardInitd = false;

        function initStoryboard(storyboard, assetManager) {
            if (storyboardInitd) {
                return;
            }

            // A bit of a HACK
            var backgroundGraphic = assetManager.get(storyboard.getBackground(0).fileName, 'image');
            textures.background = makeTexture(backgroundGraphic);

            storyboardInitd = true;
        }

        init();

        function resize() {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        return {
            beginRender: function () {
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            },

            endRender: function () {
            },

            renderMap: function (mapState, skin, time) {
                initSkin(skin);

                renderMap({
                    mapState: mapState,
                    skin: skin,
                    time: time,
                    context: context,
                    buffers: buffers,
                    programs: programs,
                    textures: textures,
                    caches: caches
                });
            },

            renderStoryboard: function (storyboard, assetManager, time) {
                initStoryboard(storyboard, assetManager);

                var draw = drawers(gl, buffers, programs);

                // Background
                draw.sprite(function (draw) {
                    // TODO Get background texture at specific time
                    var texture = textures.background;
                    var backgroundImage = texture.image;

                    var backgroundWidth = backgroundImage.width;
                    var backgroundHeight = backgroundImage.height;
                    var canvasWidth = 640;
                    var canvasHeight = 480;

                    var canvasAR = canvasWidth / canvasHeight;
                    var imageAR = backgroundWidth / backgroundHeight;
                    var scale;

                    if (imageAR > canvasAR) {
                        // Image is wider
                        scale = canvasWidth / backgroundWidth;
                    } else {
                        // Image is taller
                        scale = canvasHeight / backgroundHeight;
                    }

                    gl.uniform4f(programs.sprite.uni.color, 255, 255, 255, 255);
                    gl.uniform2f(programs.sprite.uni.position, 320, 240);
                    gl.uniform1f(programs.sprite.uni.scale, scale);
                    gl.uniform2f(programs.sprite.uni.offset, 0, 0);

                    draw(texture);
                });

                // TODO Real storyboard stuff
            }
        };
    };

    // Support methods
    // Taken from webgl-boilerplate, modified for owp
    // https://github.com/jaredwilli/webgl-boilerplate/
    function createProgram( gl, vertex, fragment ) {

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

    }

    function createShader( gl, src, type ) {

        var shader = gl.createShader( type );

        gl.shaderSource( shader, src );
        gl.compileShader( shader );

        if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {

            throw new Error( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) + "\nSOURCE:\n" + src );

        }

        return shader;

    }

    return WebGLRenderer;
});
