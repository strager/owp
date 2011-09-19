define('util/CueList', [ ], function () {
    function CueList() {
        // Each array corresponds to each other (reverse object).
        // Arrays are sorted by cue start time.
        this.cueValues = [ ];
        this.cueStarts = [ ];
        this.cueEnds = [ ];
    }

    function sortIndex(array, value) {
        var i;

        for (i = 0; i < array.length; ++i) {
            if (array[i] >= value) {
                return i;
            }
        }

        return array.length;
    }

    CueList.prototype = {
        add: function (value, startTime, endTime) {
            /*jshint white: false */

            if (typeof endTime === 'undefined') {
                endTime = startTime;
            }

            var index = sortIndex(this.cueStarts, startTime);
            this.cueValues.splice(index, 0, value);
            this.cueStarts.splice(index, 0, startTime);
            this.cueEnds  .splice(index, 0, endTime);
        },

        remove: function (value) {
            /*jshint white: false */

            var index = this.cueValues.indexOf(value);
            this.cueValues.splice(index, 1);
            this.cueStarts.splice(index, 1);
            this.cueEnds  .splice(index, 1);
        },

        removeMany: function (values) {
            // Because I am lazy...
            values.forEach(this.remove, this);
        },

        getAllAtTime: function (time) {
            return this.getAllInTimeRange(time, time);
        },

        getAllInTimeRange: function (startTime, endTime) {
            var values = [ ];
            var i;

            for (i = 0; i < this.cueValues.length; ++i) {
                if (this.cueStarts[i] > endTime) {
                    // Already passed possible cues
                    break;
                }

                if (this.cueEnds[i] < startTime) {
                    // This cue already ended
                    continue;
                }

                // Any other case is an intersection
                values.push(this.cueValues[i]);
            }

            return values;
        },

        getTimeRange: function (value) {
            var index = this.cueValues.indexOf(value);

            if (index < 0) {
                return null;
            }

            return [ this.cueStarts[index], this.cueEnds[index] ];
        }
    };

    return CueList;
});
