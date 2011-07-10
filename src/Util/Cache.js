define('Util/Cache', [ 'Util/Map' ], function (Map) {
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

                if (!this.map.contains(key)) {
                    this.map.set(key, data);
                }
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
        }
    };

    return Cache;
});
