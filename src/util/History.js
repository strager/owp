define('util/History', [ 'util/SortedMap', 'util/ease' ], function (SortedMap, ease) {
    function History() {
        this.map = new SortedMap();
        this.easing = null;
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

            // Optionally interpolate using some easing function
            if (this.map.keys[index] !== time && this.easing && index + 1 < this.map.values.length) {
                return this.easing(
                    this.map.values[index + 0], // Early time data
                    this.map.values[index + 1], // Late time data
                    ease.lerp(
                        this.map.keys[index + 0], // Early time
                        this.map.keys[index + 1], // Late time
                        time
                    )
                );
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
