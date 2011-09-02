define('Util/History', [ 'Util/SortedMap' ], function (SortedMap) {
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
        }
    };

    return History;
});
