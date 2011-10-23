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

    function addTimeout(coolAudio, timeouts, events, value, time) {
        var timeoutId = coolAudio.setInterval(function () {
            events.publish(value);
        }, time);
        timeouts.set(value, timeoutId);
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
                // We need to add timeouts for existing cues.  They don't
                // have timeouts at this point due to a lack of a pubsub; see
                // Timeline#add.
                var events = new PubSub();
                var timeouts = this.getTimeouts(key);
                var cues = this.getCueList(key);

                var i;
                for (i = 0; i < cues.cueValues.length; ++i) {
                    addTimeout(this.coolAudio, timeouts, events, cues.cueValues[i], cues.cueStarts[i]);
                }

                this.events[key] = events;
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
            if (Object.prototype.hasOwnProperty.call(this.events, key)) {
                // Only bother doing timeout stuff if we potentially have
                // subscribers
                addTimeout(this.coolAudio, this.getTimeouts(key), this.events[key], value, startTime);
            }

            return this.getCueList(key).add(value, startTime, endTime);
        },

        remove: function (key, value) {
            if (Object.prototype.hasOwnProperty.call(this.timeouts, key)) {
                var timeoutId = this.timeouts[key].get(value, null);
                if (timeoutId !== null) {
                    this.coolAudio.clearTimeout(timeoutId);
                }
            }

            return this.getCueList(key).remove(value);
        },

        removeMany: function (key, values) {
            if (Object.prototype.hasOwnProperty.call(this.timeouts, key)) {
                var timeouts = this.getTimeouts(key);
                values.forEach(function (value) {
                    var timeoutId = timeouts.get(value, null);
                    if (timeoutId !== null) {
                        this.coolAudio.clearTimeout(timeoutId);
                    }
                }, this);
            }

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
