define('Util/History', [ ], function () {
    function History() {
        this.times = [ ];
        this.data = [ ];
    }

    function sortIndex(array, value) {
        var i;

        // History items are usually added in time order, so we scan from the
        // last element to the first.
        for (i = array.length; i --> 0; /* */) {
            if (array[i] <= value) {
                return i + 1;
            }
        }

        return 0;
    }

    History.prototype = {
        add: function (time, data) {
            var index = sortIndex(this.times, time);
            this.times.splice(index, 0, time);
            this.data.splice(index, 0, data);
        },

        getDataAtTime: function (time) {
            var index = sortIndex(this.times, time);

            // index points to the entry *after* time. Since we want
            // the entry before time, we - 1.  If it's out of range,
            // no data exists, and we return null.
            index -= 1;

            if (index < 0) {
                return null;
            }

            return this.data[index];
        }
    };

    return History;
});
