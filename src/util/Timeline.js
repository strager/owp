define('util/Timeline', [ 'util/PubSub', 'util/CueList' ], function (PubSub, CueList) {
    function Timeline() {
        this.cueLists = { };
        this.events = { };
        this.isUpdating = false;
        this.lastUpdateTime = null;
        this.lastUpdatedObjects = [ ];
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

        subscribe: function (key, callback) {
            return this.getEvents(key).subscribe(callback);
        },

        update: function (time) {
            // This is a bit of a hack ...  =\
            var lastUpdateTime = (this.lastUpdateTime || 0);

            if (lastUpdateTime === time || this.isUpdating) {
                return;
            }

            var updatedObjects = [ ];
            var lastUpdatedObjects = this.lastUpdatedObjects;

            Object.keys(this.events).forEach(function (key) {
                // FIXME This is pretty broken and doesn't really work as it
                // should (but it works 'good enough' for the game to
                // work...)
                var x = this.getAllInTimeRange(lastUpdateTime, time, key);
                var events = this.getEvents(key);

                x.forEach(function (item) {
                    if (lastUpdatedObjects.indexOf(item) >= 0) {
                        // Item already updated; don't update again
                        return;
                    }

                    events.publishSync(item);
                    updatedObjects.push(item);
                });
            }, this);

            this.lastUpdatedObjects = updatedObjects;
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
