define('Util/Timeline', [ 'Util/PubSub' ], function (PubSub) {
    var CueList = function () {
        // Each array corresponds to each other (reverse object).
        // Arrays are sorted by cue start time.
        this.cueValues = [ ];
        this.cueStarts = [ ];
        this.cueEnds = [ ];
    };

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

    var Timeline = function (audio) {
        this.audio = audio;
        this.cueLists = { };
        this.events = { };
    };

    var validateKey = function (key) {
        if (typeof key !== 'string') {
            throw new TypeError('key must be a string');
        }
    };

    Timeline.prototype = {
        getCurrentTime: function () {
            return Math.round(this.audio.currentTime * 1000);
        },

        getCueList: function (key) {
            validateKey(key);

            if (!Object.prototype.hasOwnProperty.call(this.cueLists, key)) {
                this.cueLists[key] = new CueList();
            }

            return this.cueLists[key];
        },

        getEvents: function (key) {
            validateKey(key);

            if (!Object.prototype.hasOwnProperty.call(this.events, key)) {
                this.events[key] = new PubSub();
            }

            return this.events[key];
        },

        subscribe: function (key, callback) {
            this.getEvents(key).subscribe(callback);
        },

        update: function (time) {
            // This is a bit of a hack ...  =\
            var lastUpdateTime = (this.lastUpdateTime || 0);

            if (lastUpdateTime === time) {
                return;
            }

            Object.keys(this.events).forEach(function (key) {
                // FIXME This is pretty broken and doesn't really work as it
                // should (but it works 'good enough' for the game to
                // work...)
                var x = this.getAllInTimeRange(lastUpdateTime, time, key);
                var events = this.getEvents(key);

                x.forEach(function (item) {
                    events.publishSync(item);
                }, this);
            }, this);

            this.lastUpdateTime = time;
        },

        add: function (key, value, startTime, endTime) {
            return this.getCueList(key).add(value, startTime, endTime);
        },

        remove: function (key, value) {
            return this.getCueList(key).remove(value);
        },

        removeMany: function (key, values) {
            return this.getCueList(key).removeMany(values);
        },

        getAllAtTime: function (time, key) {
            return this.getCueList(key).getAllAtTime(time);
        },

        getAllInTimeRange: function (startTime, endTime, key) {
            return this.getCueList(key).getAllInTimeRange(startTime, endTime);
        }
    };

    return Timeline;
});
