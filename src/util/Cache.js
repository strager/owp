define('util/Cache', [ 'util/Map' ], function (Map) {
    // TODO Actual caching

    function Cache() {
        this.map = new Map();
    }

    Cache.prototype = {
        get: function (key, creator) {
            var data;

            if (this.map.contains(key)) {
                data = this.map.get(key);
            } else {
                data = creator(key);
                this.map.set(key, data);
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

            this.map.forEach(function (key, value) {
                if (callback.call(context, key, value) === false) {
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
