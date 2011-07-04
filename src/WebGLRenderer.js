define('WebGLRenderer', [ 'HitCircle', 'Slider', 'HitMarker', 'MapState', 'Util/gPubSub' ], function (HitCircle, Slider, HitMarker, MapState, gPubSub) {
    var renderMap = function (vars) {
        var mapState = vars.mapState;
        var ruleSet = mapState.ruleSet;
        var skin = vars.skin;
        var time = vars.time;
        var gl = vars.context;
        var buffers = vars.buffers;
        var programs = vars.programs;
        var textures = vars.textures;

        // TODO Real work

        var renderSliderObject = function (object) {
            // TODO
        };

        var renderHitCircle = function (hitCircle, progress) {
            gl.useProgram(programs.sprite);

            gl.uniform2f(programs.sprite.uni.position, hitCircle.x, hitCircle.y);
            gl.uniform2f(programs.sprite.uni.size, 640, 480);
            gl.uniform1f(programs.sprite.uni.scale, ruleSet.getCircleSize());
            gl.uniform3f(programs.sprite.uni.color, hitCircle.combo.color[0] / 255, hitCircle.combo.color[1] / 255, hitCircle.combo.color[2] / 255);

            var vertexOffset = 0;
            var uvOffset = 2 * 3 * 2 * 4; // Skip faces (2x3 pairs, x2 floats, x4 bytes)

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures.hitcircle);
            gl.uniform1i(programs.sprite.uni.sampler, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.sprite);
            gl.vertexAttribPointer(programs.sprite.attr.vertexCoord, 2, gl.FLOAT, false, 0, vertexOffset);
            gl.vertexAttribPointer(programs.sprite.attr.textureCoord, 2, gl.FLOAT, false, 0, uvOffset);
            gl.enableVertexAttribArray(programs.sprite.attr.vertexCoord);
            gl.enableVertexAttribArray(programs.sprite.attr.textureCoord);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.disableVertexAttribArray(programs.sprite.attr.vertexCoord);
            gl.disableVertexAttribArray(programs.sprite.attr.textureCoord);
return;
// TODO rest of this crap
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

        var renderHitCircleObject = function (object) {
            // TODO Approach stuff

            renderHitCircle(object);
        };

        var renderHitMarkerObject = function (object) {
            // TODO
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

    var positionShader = [
        'attribute vec3 aVertexCoord;',
        'attribute vec2 aTextureCoord;',

        'uniform vec2 uSize;',
        'uniform vec2 uPosition;',
        'uniform float uScale;',

        'varying vec2 vTextureCoord;',

        'mat4 projection = mat4(',
            '2.0 / uSize.x, 0.0, 0.0, -1.0,',
            '0.0, -2.0 / uSize.y, 0.0, 1.0,',
            '0.0, 0.0,-2.0,-0.0,',
            '0.0, 0.0, 0.0, 1.0',
        ');',

        'void main(void) {',
            'gl_Position = (vec4(aVertexCoord / 2.0, 1.0) * vec4(uScale, uScale, 1.0, 1.0) + vec4(uPosition, 0.0, 0.0)) * projection;',
            'vTextureCoord = aTextureCoord;',
        '}'
    ].join('\n');

    var colorShader = [
        'varying vec2 vTextureCoord;',

        'uniform sampler2D uSampler;',
        'uniform vec3 uColor;',

        'void main(void) {',
            'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * vec4(uColor, 1.0);',
        '}'
    ].join('\n');

    var WebGLRenderer = function (context) {
        var gl = context;

        var buffers = { };
        var programs = { };
        var textures = { };

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

            programs.sprite = createProgram(gl, positionShader, colorShader);
            programs.sprite.attr = {
                vertexCoord: gl.getAttribLocation(programs.sprite, 'aVertexCoord'),
                textureCoord: gl.getAttribLocation(programs.sprite, 'aTextureCoord')
            };
            programs.sprite.uni = {
                sampler: gl.getUniformLocation(programs.sprite, 'uSampler'),
                size: gl.getUniformLocation(programs.sprite, 'uSize'),
                position: gl.getUniformLocation(programs.sprite, 'uPosition'),
                scale: gl.getUniformLocation(programs.sprite, 'uScale'),
                color: gl.getUniformLocation(programs.sprite, 'uColor'),
            };

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);

            resize();
        };

        var skinInitd = false;

        function initSkin(skin) {
            if (skinInitd) {
                return;
            }

            function makeTexture(image) {
                var texture = gl.createTexture();
                texture.image = image;

                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

                return texture;
            }

            var hitCircleGraphic = skin.assetManager.get('hitcircle', 'image-set');
            var hitCircleFrame = 0;

            textures.hitcircle = makeTexture(hitCircleGraphic[hitCircleFrame]);

            gl.bindTexture(gl.TEXTURE_2D, null);
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
                    textures: textures
                });
            },

            renderStoryboard: function (storyboard, assetManager, time) {
                // TODO
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
