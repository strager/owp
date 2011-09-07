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
        }
    };

    return SortedMap;
});
