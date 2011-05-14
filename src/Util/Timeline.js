define('Util/Timeline', [ ], function () {
    var Timeline = function () {
        this.items = [ ];
    };

    var validateKey = function (key) {
        if (typeof key === 'undefined') {
            throw new TypeError('key must not be undefined');
        }

        if (typeof key === 'object' && key === null) {
            throw new TypeError('key must not be null');
        }

        if (typeof key === 'number' || key instanceof Number) {
            throw new TypeError('key must not be a number');
        }
    };

    Timeline.prototype = {
        add: function (key, value, startTime, endTime) {
            validateKey(key);

            if (typeof endTime === 'undefined') {
                endTime = startTime;
            }

            var item = {
                key: key,
                value: value,
                startTime: startTime,
                endTime: endTime
            };

            this.items.push(item);
        },

        getAllAtTime: function (time, key) {
            var filterFunc = null;

            if (typeof key === 'undefined') {
                filterFunc = function (item) {
                    return item.startTime <= time && time < item.endTime;
                };
            } else {
                validateKey(key);

                filterFunc = function (item) {
                    return item.startTime <= time && time < item.endTime
                        && item.key === key;
                };
            }

            return this.items.filter(filterFunc).map(function (item) {
                return item.value;
            });
        }
    };

    return Timeline;
});
