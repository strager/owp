define([ 'assert', 'Util/Timeline' ], function (assert, Timeline) {
    return {
        'spawned before': function () {
            var obj = { };

            var t = new Timeline();
            t.add('', obj, 10, 20);

            assert.deepEqual([ ], t.getAllAtTime(0));
            assert.deepEqual([ ], t.getAllAtTime(9));
        },

        'spawned during': function () {
            var obj = { };

            var t = new Timeline();
            t.add('', obj, 10, 20);

            assert.deepEqual([ obj ], t.getAllAtTime(10));
            assert.deepEqual([ obj ], t.getAllAtTime(19));
        },

        'spawned after': function () {
            var obj = { };

            var t = new Timeline();
            t.add('', obj, 10, 20);

            assert.deepEqual([ ], t.getAllAtTime(20));
            assert.deepEqual([ ], t.getAllAtTime(200));
        },

        'no key gives all': function () {
            var obj1 = { a: 1 };
            var obj2 = { b: 2 };

            var t = new Timeline();
            t.add('key1', obj1, 0, 999);
            t.add('key2', obj2, 0, 999);

            var objs = t.getAllAtTime(100);

            // objs should be [ obj1, obj2 ] or [ obj2, obj1 ]
            assert.equal(objs.length, 2);
            assert.ok(objs.indexOf(obj1) >= 0, 'obj1 is in objs');
            assert.ok(objs.indexOf(obj2) >= 0, 'obj2 is in objs');
        },

        'one key gives one': function () {
            var obj1 = { a: 1 };
            var obj2 = { b: 2 };

            var t = new Timeline();
            t.add('key1', obj1, 0, 999);
            t.add('key2', obj2, 0, 999);

            assert.deepEqual([ obj1 ], t.getAllAtTime(100, 'key1'));
        }
    };
});
