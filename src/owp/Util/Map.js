exports.$ = (function () {
    var Map = function () {
        this.data = [ ];
    };

    Map.prototype = {
        areKeysEqual: function (a, b) {
            var i;

            if (a instanceof Array && b instanceof Array) {
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
            for (i = 0; i < this.data.length; ++i) {
                data = this.data[i];

                if (this.areKeysEqual(data.key, key)) {
                    data.value = value;

                    return;
                }
            }

            this.data.unshift({
                key: key,
                value: value
            });
        },

        getIndexFromKey: function (key) {
            var i, data;

            for (i = 0; i < this.data.length; ++i) {
                data = this.data[i];

                if (this.areKeysEqual(data.key, key)) {
                    return i;
                }
            }

            return -1;
        },

        get: function (key) {
            var index = this.getIndexFromKey(key);

            if (index < 0) {
                throw 'No such value for key ' + key;
            }

            return this.data[index].value;
        },

        contains: function (key) {
            return this.getIndexFromKey(key) >= 0;
        },

        unset: function (key) {
            var index = this.getIndexFromKey(key);

            if (index < 0) {
                throw 'No such value for key ' + key;
            }

            this.data.splice(index, 1);
        },

        forEach: function (callback, context) {
            var i;

            for (i = 0; i < this.data.length; ++i) {
                callback.call(context, this.data[i].key, this.data[i].value);
            }
        }
    };

    return Map;
}());
