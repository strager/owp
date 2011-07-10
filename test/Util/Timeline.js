define([ 'assert', 'Util/Timeline' ], function (assert, Timeline) {
    var assertThrows = function (callback) {
        var hasThrown = false;

        try {
            callback();
        } catch (err) {
            hasThrown = true;
        }

        assert.ok(hasThrown, 'exception not thrown');
    };

    return {
        'spawned before': function () {
            var obj = { };

            var t = new Timeline();
            t.add('', obj, 10, 20);

            assert.deepEqual([ ], t.getAllAtTime(0, ''));
            assert.deepEqual([ ], t.getAllAtTime(9, ''));
        },

        'spawned during': function () {
            var obj = { };

            var t = new Timeline();
            t.add('', obj, 10, 20);

            assert.deepEqual([ obj ], t.getAllAtTime(10, ''));
            assert.deepEqual([ obj ], t.getAllAtTime(19, ''));
        },

        'spawned after': function () {
            var obj = { };

            var t = new Timeline();
            t.add('', obj, 10, 20);

            assert.deepEqual([ ], t.getAllAtTime(21, ''));
            assert.deepEqual([ ], t.getAllAtTime(200, ''));
        },

        'one key gives one': function () {
            var obj1 = { a: 1 };
            var obj2 = { b: 2 };

            var t = new Timeline();
            t.add('key1', obj1, 0, 999);
            t.add('key2', obj2, 0, 999);

            assert.deepEqual([ obj1 ], t.getAllAtTime(100, 'key1'));
        },

        'get all in time range': function () {
            var t = new Timeline();
            t.add('key1', 'value1', 0, 999);
            t.add('key2', 'value2', 0, 999);
            t.add('key1', 'value3', 500, 999);
            t.add('key1', 'value4', 0, 350);
            t.add('key1', 'value5', 299, 500);

            assert.deepEqual(
                t.getAllInTimeRange(299, 299, 'key1').sort(),
                [ 'value1', 'value4', 'value5' ].sort()
            );
        },

        'get all in time range after': function () {
            var t = new Timeline();
            t.add('key1', 'value1', 0, 999);

            assert.deepEqual(
                t.getAllInTimeRange(1000, 1010, 'key1').sort(),
                [ ]
            );
        },

        'key cannot be null': function () {
            assertThrows(function () {
                var t = new Timeline();
                t.add(null, { }, 0, 10);
            });
        },

        'key cannot be undefined': function () {
            assertThrows(function () {
                var t = new Timeline();
                t.add(undefined, { }, 0, 10);
            });
        },

        'key cannot be an object': function () {
            assertThrows(function () {
                var t = new Timeline();
                t.add({ }, { }, 0, 10);
            });
        },

        'key cannot be a number': function () {
            assertThrows(function () {
                var t = new Timeline();
                t.add(42, { }, 0, 10);
            });
        }
    };
});
