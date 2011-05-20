/*global console*/
require({ baseUrl: 'src' }, [ ], function (module) {
    var tests = [
        'MapState',
        'AssetConfigReader',
        'RuleSet',
        'Util/Map',
        'Util/Timeline'
    ];

    var suite = { };

    tests.forEach(function (test) {
        suite[test] = require('./test/' + test);
    });

    var runTestRecursive = function (obj) {
        var runTestRecursiveImpl = null;

        var runTestFunction = function (func, names) {
            try {
                func();

                return [ ];
            } catch (e) {
                return [ { error: e, names: names } ];
            }
        };

        var runTestObject = function (obj, names) {
            var errors = [ ];

            Object.keys(obj).forEach(function (testName) {
                var testErrors = runTestRecursiveImpl(obj[testName], names.concat([ testName ]));

                errors = errors.concat(testErrors);
            });

            return errors;
        };

        runTestRecursiveImpl = function (obj, names) {
            if (typeof obj === 'function') {
                return runTestFunction(obj, names);
            } else if (typeof obj === 'object') {
                return runTestObject(obj, names);
            }
        };

        return runTestRecursiveImpl(obj, [ ]);
    };

    var errors = runTestRecursive(suite);

    if (errors.length === 0) {
        console.log('All tests passed');
    } else {
        errors.forEach(function (error) {
            console.error('Error in ' + error.names.join(' ') + ':');
            console.error(error.error.stack);
        });

        console.log('Some tests failed; see errors above');
    }
});
