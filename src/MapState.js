define('MapState', [ 'Util/TimedMap', 'Util/Map', 'HitMarker' ], function (TimedMap, Map, HitMarker) {
    var MapState = function (ruleSet, objects) {
        this.ruleSet = ruleSet;

        this.objectMap = new TimedMap();
        this.objectMap.spawnMany(objects);

        this.hitMarkers = new TimedMap();
        this.objectToHitMarkers = new Map();
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
        },

        getHittableObjects: function (time) {
            // TODO Add rule set functions and use 'em

            return this.getVisibleObjects(time);
        },

        makeHit: function (x, y, time) {
            var hittableObjects = this.getHittableObjects(time).sort(function (a, b) {
                // Sort by time ascending
                return a.time < b.time ? -1 : 1;
            });

            var i, object;
            var hitMarker;

            for (i = 0; i < hittableObjects.length; ++i) {
                object = hittableObjects[i];

                if (this.ruleSet.canHitObject(object, x, y, time)) {
                    hitMarker = new HitMarker(object, time);
                    hitMarker.score = this.ruleSet.getHitScore(object, hitMarker);

                    this.hitMarkers.spawn(hitMarker);

                    // TODO Multi-map
                    if (this.objectToHitMarkers.contains(object)) {
                        this.objectToHitMarkers.get(object).push(hitMarker);
                    } else {
                        this.objectToHitMarkers.set(object, [ hitMarker ]);
                    }

                    return hitMarker;
                }
            }

            return null;
        }
    };

    return MapState;
});
