define('WebGLRenderer', [ ], function () {
    var renderMap = function (vars) {
        var mapState = vars.mapState;
        var ruleSet = mapState.ruleSet;
        var skin = vars.skin;
        var time = vars.time;
        var gl = vars.context;
        var buffers = vars.buffers;
        var programs = vars.programs;

        // TODO Real work

        gl.useProgram(programs.whatever);

        gl.uniform1f(gl.getUniformLocation(programs.whatever, 'time'), time / 1000);
        gl.uniform2f(gl.getUniformLocation(programs.whatever, 'resolution'), gl.canvas.width, gl.canvas.height);

        var vertex_position = 0;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.spriteVertex);
        gl.vertexAttribPointer(vertex_position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vertex_position);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disableVertexAttribArray(vertex_position);
    };

    var positionShader = [
        'attribute vec3 position;',

        'void main(void) {',
            'gl_Position = vec4(position, 1.0);',
        '}'
    ].join('\n');

    var colorShader = [
        'uniform float time;',
        'uniform vec2 resolution;',

        'void main(void) {',
            'vec2 position = - 1.0 + 2.0 * gl_FragCoord.xy / resolution.xy;',
            'float red = abs(sin(position.x * position.y + time / 5.0));',
            'float green = abs(sin(position.x * position.y + time / 4.0));',
            'float blue = abs(sin(position.x * position.y + time / 3.0));',
            'gl_FragColor = vec4(red, green, blue, 1.0);',
        '}'
    ].join('\n');

    var WebGLRenderer = function (context) {
        var gl = context;

        var buffers = { };
        var programs = { };

        function init() {
            buffers.spriteVertex = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.spriteVertex);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1,  1,
                -1, -1,  1,
                 1, -1,  1,
                 1, -1,  1
            ]), gl.STATIC_DRAW);

            programs.whatever = createProgram(gl, positionShader, colorShader);

            resize();
        }

        function resize() {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        init();

        return {
            beginRender: function () {
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            },

            endRender: function () {
            },

            renderMap: function (mapState, skin, time) {
                renderMap({
                    mapState: mapState,
                    skin: skin,
                    time: time,
                    context: context,
                    buffers: buffers,
                    programs: programs
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
