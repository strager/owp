define('util/Cache', [ 'util/Map' ], function (Map) {
    // TODO Actual caching

    function Cache() {
        this.map = new Map();
    }

    Cache.prototype = {
        get: function (key, creator) {
            var index = this.map.getIndexFromKey(key);

            var data;
            if (index >= 0) {
                data = this.map.values[index];
            } else {
                data = creator(key);
                this.map.add(key, data);
            }

            return data;
        },

        set: function (key, value) {
            this.map.set(key, value);
        },

        unset: function (key) {
            this.map.unset(key);
        },

        contains: function (key) {
            return this.map.contains(key);
        },

        collect: function (callback, context) {
            var keysToRemove = [ ];

            this.map.forEach(function (key, value, i) {
                if (callback.call(context, key, value, i) === false) {
                    keysToRemove.push(key);
                }
            });

            keysToRemove.forEach(function (key) {
                this.map.unset(key);
            }, this);
        }
    };

    return Cache;
});
