define('util/ShortCache', [ 'util/Cache' ], function (Cache) {
    function ShortCache() {
        this.cache = new Cache();
        this.touched = [ ];
    }

    ShortCache.prototype.collect = function (callback, context) {
        var map = this.cache.map;
        var touchedIndices = this.touched.map(function (key) {
            return map.getIndexFromKey(key);
        });

        this.cache.collect(function (key, value, i) {
            var shouldCollect = touchedIndices.indexOf(i) >= 0;

            if (shouldCollect) {
                callback.call(context, key, value);
                return false;
            }
        }, this);

        this.touched.length = 0;
    };

    ShortCache.prototype.get = function (key, creator) {
        var ret = this.cache.get(key, creator);
        this.touched.push(key);
        return ret;
    };

    return ShortCache;
});
