(function () {
    var assert = require('assert');
    var TimedMap = require('owp/Util/TimedMap').$;

    function makeTimedMap() {
        return new TimedMap(function (item) {
            return item.start;
        }, function (item) {
            return item.end;
        });
    }

    exports.testSpawnedBefore = function () {
        var tm = makeTimedMap();
        tm.spawn({ start: 10, end: 20 });

        assert.deepEqual([ ], tm.get(0));
        assert.deepEqual([ ], tm.get(9));
    };

    exports.testSpawnedDuring = function () {
        var item = { start: 10, end: 20 };

        var tm = makeTimedMap();
        tm.spawn(item);

        assert.deepEqual([ item ], tm.get(10));
        assert.deepEqual([ item ], tm.get(19));
    };

    exports.testSpawnedAfter = function () {
        var tm = makeTimedMap();
        tm.spawn({ start: 10, end: 20 });

        assert.deepEqual([ ], tm.get(20));
        assert.deepEqual([ ], tm.get(200));
    };
}());
