define('Util/Map', [ ], function () {
    var Map = function () {
        this.keys = [ ];
        this.values = [ ];
    };

    function isArray(x) {
        return Object.prototype.toString.call(x) === '[object Array]';
    }

    Map.prototype = {
        areKeysEqual: function (a, b) {
            var i;

            if (isArray(a) && isArray(b)) {
                // Weak comparison for arrays
                if (a.length !== b.length) {
                    return false;
                }

                for (i = 0; i < a.length; ++i) {
                    if (!this.areKeysEqual(a[i], b[i])) {
                        return false;
                    }
                }

                return true;
            } else {
                // Strong comparison for non-arrays
                return a === b;
            }
        },

        set: function (key, value) {
            var i, j, data;

            // Check if the data already exists in the map
            // If so, just override it
            var index = this.getIndexFromKey(key);

            if (index >= 0) {
                this.values[index] = value;
            } else {
                this.keys.push(key);
                this.values.push(value);
            }
        },

        getIndexFromKey: function (key) {
            // Super fast case: indexOf works (same object)
            var index = this.keys.indexOf(key);

            if (index >= 0) {
                return index;
            }

            // Super slow case: manual iteration and comparison
            var curKey;

            for (index = 0; index < this.keys.length; ++index) {
                curKey = this.keys[index];

                if (this.areKeysEqual(curKey, key)) {
                    return index;
                }
            }

            return -1;
        },

        get: function (key, defaultValue) {
            var index = this.getIndexFromKey(key);

            if (index < 0) {
                if (arguments.length > 1) {
                    // If defaultValue was specified, return it
                    // (undefined is a legal defaultValue,
                    //  and if no defaultvalue is given, throw)
                    return defaultValue;
                }

                throw new Error('No such value for key ' + key);
            }

            return this.values[index];
        },

        contains: function (key) {
            return this.getIndexFromKey(key) >= 0;
        },

        unset: function (key) {
            var index = this.getIndexFromKey(key);

            if (index < 0) {
                throw new Error('No such value for key ' + key);
            }

            this.keys.splice(index, 1);
            this.values.splice(index, 1);
        },

        forEach: function (callback, context) {
            var i;

            for (i = 0; i < this.keys.length; ++i) {
                callback.call(context, this.keys[i], this.values[i]);
            }
        }
    };

    return Map;
});
