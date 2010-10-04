exports.$ = (function () {
    var MapState = function (map) {
        this.map = map;
        this.objects = map.objects.sort(function (a, b) {
            // Sort objects by time ascending
            return a.time > b.time ? 1 : a.time < b.time ? -1 : 0;
        });
    };

    MapState.prototype = {
        getVisibleObjects: function (time) {
            // TODO wu.js?  .filter?
            var i, visibleObjects = [ ];
            var objectState;

            for (i = 0; i < this.objects.length; ++i) {
                objectState = this.map.ruleSet.getObjectStateAtTime(this.objects[i], time);

                // Optimization; stop scanning if we're after visible objects
                if (objectState === 'after') {
                    break;
                }

                if (objectState === 'during' || objectState === 'appearing' || objectState === 'disappearing') {
                    visibleObjects.push(this.objects[i]);
                }
            }

            return visibleObjects;
        }
    };

    return MapState;
}());
