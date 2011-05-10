define([ 'assert', 'Util/TimedMap' ], function (assert, TimedMap) {
    var exports = { };

    function start(item) {
        return item.start;
    }

    function end(item) {
        return item.end;
    }

    exports.testSpawnedBefore = function () {
        var tm = new TimedMap();
        tm.spawn({ start: 10, end: 20 });

        assert.deepEqual([ ], tm.get(0, start, end));
        assert.deepEqual([ ], tm.get(9, start, end));
    };

    exports.testSpawnedDuring = function () {
        var item = { start: 10, end: 20 };

        var tm = new TimedMap();
        tm.spawn(item);

        assert.deepEqual([ item ], tm.get(10, start, end));
        assert.deepEqual([ item ], tm.get(19, start, end));
    };

    exports.testSpawnedAfter = function () {
        var tm = new TimedMap();
        tm.spawn({ start: 10, end: 20 });

        assert.deepEqual([ ], tm.get(20, start, end));
        assert.deepEqual([ ], tm.get(200, start, end));
    };

    return exports;
});
