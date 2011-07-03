define('Util/Timeline', [ 'Util/PubSub' ], function (PubSub) {
    var Timeline = function (audio) {
        this.audio = audio;
        //this.tracks = { }; // TODO...
        this.cueLists = { };
        this.events = { };
    };

    var validateKey = function (key) {
        if (typeof key !== 'string') {
            throw new TypeError('key must be a string');
        }
    };

    var filter = function (timeline, key, filterFunc) {
        return timeline.getCueList(key)
            .filter(filterFunc)
            .sort(function (a, b) {
                return a.time < b.time ? -1 : 1;
            })
            .map(function (item) {
                return item.value;
            });
    };

    var filter2 = function (timeline, key, filterFunc) {
        return timeline.getCueList(key)
            .filter(filterFunc)
            .sort(function (a, b) {
                return a.time < b.time ? -1 : 1;
            });
    };

    Timeline.prototype = {
        getCurrentTime: function () {
            return Math.round(this.audio.currentTime * 1000);
        },

        getTrack: function (key) {
            throw new Error('Not implemented');

            validateKey(key);

            if (!Object.prototype.hasOwnProperty.call(this.tracks, key)) {
                this.tracks[key] = this.audio.addTextTrack(key);
            }

            return this.tracks[key];
        },

        getCueList: function (key) {
            validateKey(key);

            if (!Object.prototype.hasOwnProperty.call(this.cueLists, key)) {
                this.cueLists[key] = [ ];
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

        subscribe: function (key, eventKey, callback) {
            this.getEvents(key).subscribe(eventKey, callback);
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
                var x = this.getAllItemsInTimeRange(lastUpdateTime, time, key);
                var events = this.getEvents(key);

                x.forEach(function (item) {
                    events.publishSync('enter', item.value);
                }, this);
            }, this);

            this.lastUpdateTime = time;
        },

        add: function (key, value, startTime, endTime) {
            var cueList = this.getCueList(key);

            if (typeof endTime === 'undefined') {
                endTime = startTime;
            }

            cueList.push({
                value: value,
                startTime: startTime,
                endTime: endTime
            });
        },

        remove: function (key, value) {
            var cueList = this.getCueList(key);

            this.cueLists[key] = cueList.filter(function (item) {
                return item.value !== value;
            });
        },

        removeMany: function (key, values) {
            var cueList = this.getCueList(key);

            this.cueLists[key] = cueList.filter(function (item) {
                return values.indexOf(item.value) < 0;
            });
        },

        getAllAtTime: function (time, key) {
            var filterFunc = function (item) {
                return item.startTime <= time && time < item.endTime;
            };

            return filter(this, key, filterFunc);
        },

        getAllInTimeRange: function (startTime, endTime, key) {
            return filter(this, key, function (item) {
                // [] is item; () is arguments

                // [ ] ( )
                if (item.endTime < startTime) {
                    return false;
                }

                // ( ) [ ]
                if (endTime < item.startTime) {
                    return false;
                }

                // Any other case is an intersection
                return true;
            });
        },

        getAllItemsInTimeRange: function (startTime, endTime, key) {
            return filter2(this, key, function (item) {
                // [] is item; () is arguments

                // [ ] ( )
                if (item.endTime < startTime) {
                    return false;
                }

                // ( ) [ ]
                if (endTime < item.startTime) {
                    return false;
                }

                // Any other case is an intersection
                return true;
            });
        }
    };

    return Timeline;
});
