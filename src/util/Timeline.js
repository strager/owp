define('util/Timeline', [ 'util/PubSub', 'util/CueList', 'util/Map' ], function (PubSub, CueList, Map) {
    function Timeline(coolAudio) {
        this.coolAudio = coolAudio;

        // key => CueList
        this.cueLists = { };

        // key => PubSub
        this.events = { };

        // key => Map(value => id)
        // FIXME Should be a multimap to allow multiple of the same value?
        this.timeouts = { };
    }

    function validateKey(key) {
        if (typeof key !== 'string') {
            throw new TypeError('key must be a string');
        }
    }

    Timeline.prototype = {
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

        getTimeouts: function (key) {
            validateKey(key);

            if (!Object.prototype.hasOwnProperty.call(this.timeouts, key)) {
                this.timeouts[key] = new Map();
            }

            return this.timeouts[key];
        },

        subscribe: function (key, callback) {
            return this.getEvents(key).subscribe(callback);
        },

        add: function (key, value, startTime, endTime) {
            // TODO Don't bother doing timeout stuff if we have no
            // subscribers
            var timeoutId = this.coolAudio.setTimeout(function () {
                this.getEvents(key).publish(value);
            }, startTime, this);
            this.getTimeouts(key).set(value, timeoutId);

            return this.getCueList(key).add(value, startTime, endTime);
        },

        remove: function (key, value) {
            var timeoutId = this.getTimeouts(key).get(value, null);
            if (timeoutId !== null) {
                this.coolAudio.clearTimeout(timeoutId);
            }

            return this.getCueList(key).remove(value);
        },

        removeMany: function (key, values) {
            var timeouts = this.getTimeouts(key);
            values.forEach(function (value) {
                var timeoutId = timeouts.get(value, null);
                if (timeoutId !== null) {
                    this.coolAudio.clearTimeout(timeoutId);
                }
            }, this);

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
