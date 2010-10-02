(function () {
    require.paths.unshift(__dirname);
    require.paths.unshift(__dirname + '/src');

    var tests = [
    ];

    var i;

    for (i = 0; i < tests.length; ++i) {
        exports[tests[i]] = require(__dirname + '/test/' + tests[i]);
    }

    if (require.main === module) {
        require('patr/runner').run(module.exports);
    }
}());
