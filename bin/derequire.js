var fs = require('fs');
var path = require('path');
var vm = require('vm');

function derequire(mainFilename, baseUrl, output, blacklist) {
    var loadedFiles = [ ];

    function getModuleName(name) {
        return 'derequire_module__' + name.replace(/[^a-z]/gi, '_');
    }

    function getModuleFilename(name) {
        return path.join(baseUrl, name) + '.js';
    }

    function loadFile(filename) {
        if (loadedFiles.indexOf(filename) >= 0) {
            // Already loaded
            return;
        }

        process.stderr.write('Herping ' + filename + '\n');

        var code = fs.readFileSync(filename);

        vm.runInNewContext(code, {
            require: myRequire,
            define: myDefine
        }, filename);

        loadedFiles.push(filename);
    }

    function loadModule(name) {
        if (blacklist.indexOf(name) >= 0) {
            process.stderr.write('Derping ' + name + '\n');
            return;
        }

        loadFile(getModuleFilename(name));
    }

    function myRequire(deps, callback) {
        deps.forEach(loadModule);

        output.write('(function () {\n');

        var fn = callback.toString();
        var args = /\((.*?)\)/.exec(fn)[1].split(/[,\s]+/g);
        var body = fn.substr(fn.indexOf('{') + 1).replace(/}[\s\r\n]*$/g, '');

        deps.forEach(function (dep, i) {
            output.write('var ' + args[i] + ' = ' + getModuleName(dep) + ';\n');
        });

        output.write(body);
        output.write('}());\n');
    }

    function myDefine(name, deps, callback) {
        deps.forEach(loadModule);

        output.write('var ' + getModuleName(name) + ' = ');
        myRequire(deps, callback);
    }

    output.write('(function () {\n');
    loadFile(mainFilename);
    output.write('}());\n');
}

derequire(process.argv[2], process.argv[3], process.stdout, [ 'q' ]);
