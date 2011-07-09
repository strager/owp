define('Util/Map', [ ], function () {
    function Map() {
        this.keys = [ ];
        this.arrayKeyStrings = { };
        this.values = [ ];
    }

    function isArray(value) {
        return value instanceof Array;
    }

    function getKeyString(key) {
        return key.join('');
    }

    Map.prototype = {
        areArraysEqual: function (a, b) {
            var i;

            if (a.length !== b.length) {
                return false;
            }

            for (i = 0; i < a.length; ++i) {
                if (a[i] !== b[i]) {
                    return false;
                }
            }

            return true;
        },

        set: function (key, value) {
            // Check if the data already exists in the map
            // If so, just override it
            var index = this.getIndexFromKey(key);
            var keyString;

            if (index >= 0) {
                this.values[index] = value;
            } else {
                this.keys.push(key);
                this.values.push(value);

                if (isArray(key)) {
                    keyString = getKeyString(key);
                    index = this.keys.length - 1;

                    if (Object.prototype.hasOwnProperty(this.arrayKeyStrings, keyString)) {
                        this.arrayKeyStrings[keyString].push(index);
                    } else {
                        this.arrayKeyStrings[keyString] = [ index ];
                    }
                }
            }
        },

        getIndexFromKey: function (key) {
            // Super fast case: non-arrays
            if (!isArray(key)) {
                return this.keys.indexOf(key);
            }

            // Slowish case: check key strings
            var keyString = getKeyString(key);

            if (!Object.prototype.hasOwnProperty.call(this.arrayKeyStrings, keyString)) {
                return -1;
            }

            // We have a matching key string; check all keys
            var indices = this.arrayKeyStrings[keyString];

            var i, index;

            for (i = 0; i < indices.length; ++i) {
                index = indices[i];

                if (this.areArraysEqual(this.keys[index], key)) {
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

            var keyString, indices, indexIndex;

            if (isArray(key)) {
                keyString = getKeyString(key);
                indices = this.arrayKeyStrings[keyString];

                if (indices.length === 1) {
                    delete this.arrayKeyStrings[keyString];
                } else {
                    indexIndex = indices.indexOf(index);
                    indices.splice(indexIndex, 1);
                }
            }

            // Now shift everything above index down one...
            Object.keys(this.arrayKeyStrings).forEach(function (keyString) {
                this.arrayKeyStrings[keyString] = this.arrayKeyStrings[keyString].map(function (i) {
                    return i < index ? i : i - 1;
                });
            }, this);
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
