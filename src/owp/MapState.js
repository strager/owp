exports.$ = (function () {
    var TimedMap = require('owp/Util/TimedMap').$;

    var MapState = function (ruleSet, objects) {
        this.ruleSet = ruleSet;

        this.objectMap = new TimedMap();
        this.objectMap.spawnMany(objects);
    };

    MapState.fromMapInfo = function (mapInfo) {
        return new MapState(mapInfo.ruleSet, mapInfo.map.objects);
    };

    MapState.prototype = {
        getVisibleObjects: function (time) {
            var ruleSet = this.ruleSet;

            return this.objectMap.get(time, function start(hitObject) {
                return ruleSet.getObjectAppearTime(hitObject);
            }, function end(hitObject) {
                return ruleSet.getObjectDisappearTime(hitObject);
            });
        }
    };

    return MapState;
}());
