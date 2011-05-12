define([ 'assert', 'Util/Timeline' ], function (assert, Timeline) {
    return {
        'spawned before': function () {
            var obj = { };

            var t = new Timeline();
            t.add(null, obj, 10, 20);

            assert.deepEqual([ ], t.getAllAtTime(0));
            assert.deepEqual([ ], t.getAllAtTime(9));
        },

        'spawned during': function () {
            var obj = { };

            var t = new Timeline();
            t.add(null, obj, 10, 20);

            assert.deepEqual([ obj ], t.getAllAtTime(10));
            assert.deepEqual([ obj ], t.getAllAtTime(19));
        },

        'spawned after': function () {
            var obj = { };

            var t = new Timeline();
            t.add(null, obj, 10, 20);

            assert.deepEqual([ ], t.getAllAtTime(20));
            assert.deepEqual([ ], t.getAllAtTime(200));
        }
    };
});
