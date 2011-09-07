define('util/SortedMap', [ ], function () {
    function SortedMap() {
        this.keys = [ ];
        this.values = [ ];
    }

    // Returns the index in array whose value is greater than or equal to
    // value
    function sortIndex(array, value) {
        var i;

        // TODO Binary search
        for (i = array.length; i --> 0; /* */) {
            if (array[i] <= value) {
                return i + 1;
            }
        }

        return 0;
    }

    SortedMap.prototype = {
        set: function (key, value) {
            var index = sortIndex(this.keys, key);

            if (this.keys[index] === key) {
                this.values[index] = value;
            } else {
                this.keys.splice(index, 0, key);
                this.values.splice(index, 0, value);
            }
        },

        getIndexForKey: function (key) {
            return sortIndex(this.keys, key);
        },

        forEach: function (callback, context) {
            var keys = this.keys.slice();
            var values = this.values.slice();

            var i, shouldContinue = undefined;
            for (i = 0; i < keys.length; ++i) {
                shouldContinue = callback.call(context, values[i], keys[i], i);

                if (shouldContinue === false) {
                    // Explicit false; stop.
                    // This is a bit different than Array#forEach, but
                    // screw you all!
                    break;
                }
            }
        },

        getHashBetweenKeys: function (lo, hi) {
            var loIndex = this.getIndexForKey(lo);
            var hiIndex = this.getIndexForKey(hi);

            var hash = { };

            var i;
            for (i = loIndex; i < hiIndex; ++i) {
                hash[this.keys[i]] = this.values[i];
            }

            return hash;
        }
    };

    return SortedMap;
});
