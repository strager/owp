define([ 'assert', 'Util/Map' ], function (assert, Map) {
    var exports = { };

    exports.testSetGet = function () {
        var map = new Map();
        var key = { };
        var value = { };

        map.set(key, value);

        assert.equal(value, map.get(key));
    };

    exports.testSetTwiceOverrides = function () {
        var map = new Map();
        var key = { };
        var value = { };

        map.set(key, { });
        map.set(key, value);

        assert.equal(value, map.get(key));
    };

    exports.testGetDefault = function () {
        var map = new Map();

        map.set('key', 'value');

        assert.equal('default', map.get('not-key', 'default'));
    };

    exports.testSetDifferentObjectDoesNotOverride = function () {
        var map = new Map();
        var key1 = { };
        var key2 = { };

        map.set(key1, 1);
        map.set(key2, 2);

        assert.equal(1, map.get(key1));
        assert.equal(2, map.get(key2));
    };

    exports.testSetDifferentArrayOverrides = function () {
        var map = new Map();
        var key1 = [ 1, 2 ];
        var key2 = [ 1, 2 ];

        map.set(key1, 1);
        map.set(key2, 2);

        assert.equal(2, map.get(key1));
        assert.equal(2, map.get(key2));
    };

    exports.testForEach = function () {
        var map = new Map();

        var hit = [ ];
        var hits = 0;

        var i;

        for (i = 0; i < 10; ++i) {
            map.set(i, i * (i - 1));
        }

        map.forEach(function (key, value) {
            assert.equal(undefined, hit[key]);

            hit[key] = true;
            ++hits;

            assert.equal(key * (key - 1), value);
        });

        assert.equal(10, hits);
    };

    return exports;
});
