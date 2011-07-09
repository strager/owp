define('Util/History', [ ], function () {
    function History() {
        this.times = [ ];
        this.data = [ ];
    }

    function sortIndex(array, value) {
        var i;

        for (i = 0; i < array.length; ++i) {
            if (array[i] > value) {
                return i;
            }
        }

        return array.length;
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
