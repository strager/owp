define('util/History', [ 'util/SortedMap' ], function (SortedMap) {
    function History() {
        this.map = new SortedMap();
    }

    History.prototype = {
        add: function (time, data) {
            this.map.set(time, data);
        },

        getDataAtTime: function (time) {
            var index = this.map.getIndexForKey(time);

            // index points to the entry *after* time. Since we want
            // the entry before time, we - 1.  If it's out of range,
            // no data exists, and we return null.
            index -= 1;

            if (index < 0) {
                return null;
            }

            return this.map.values[index];
        },

        getFirst: function (def) {
            if (this.map.values.length === 0) {
                if (arguments.length === 0) {
                    throw new Error('Cannot get first history item of empty history');
                } else {
                    return def;
                }
            }

            return this.map.values[0];
        },

        getLast: function (def) {
            if (this.map.values.length === 0) {
                if (arguments.length === 0) {
                    throw new Error('Cannot get last history item of empty history');
                } else {
                    return def;
                }
            }

            return this.map.values[this.map.values.length - 1];
        }
    };

    return History;
});
