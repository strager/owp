exports.$ = (function () {
    var TimedMap = function () {
        this.items = [ ];
    };

    TimedMap.prototype = {
        spawn: function (item) {
            this.items.push(item);
        },

        spawnMany: function (items) {
            this.items = this.items.concat(items);
        },

        get: function (time, startFunc, endFunc) {
            // TODO Optimize to minimize looping
            // (Probably sort by start time, and cache out passed
            // items based on the last time accessed)

            var ret = [ ];

            var i, item;

            for (i = 0; i < this.items.length; ++i) {
                item = this.items[i];

                if (startFunc(item) <= time && time < endFunc(item)) {
                    ret.push(item);
                }
            }

            return ret;
        }
    };

    return TimedMap;
}());
