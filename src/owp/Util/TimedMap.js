exports.$ = (function () {
    var TimedMap = function (startFunc, endFunc) {
        this.startFunc = startFunc;
        this.endFunc = endFunc;

        this.items = [ ];
    };

    TimedMap.prototype = {
        spawn: function (item) {
            this.items.push(item);
        },

        spawnMany: function (items) {
            this.items = this.items.concat(items);
        },

        get: function (time) {
            // TODO Optimize to minimize looping
            // (Probably sort by time, and cache out passed
            // items based on the last time accessed)

            var ret = [ ];

            var i, item;

            for (i = 0; i < this.items.length; ++i) {
                item = this.items[i];

                if (this.startFunc(item) <= time && time < this.endFunc(item)) {
                    ret.push(item);
                }
            }

            return ret;
        }
    };

    return TimedMap;
}());
