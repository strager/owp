define('MapState', [ 'Util/Timeline', 'Util/Map', 'HitMarker' ], function (Timeline, Map, HitMarker) {
    var MapState = function (ruleSet, objects) {
        this.ruleSet = ruleSet;

        var timeline = this.timeline = new Timeline();

        objects.forEach(function (hitObject) {
            var appearTime = ruleSet.getObjectAppearTime(hitObject);
            var disappearTime = ruleSet.getObjectDisappearTime(hitObject);

            timeline.add(MapState.HIT_OBJECT_VISIBILITY, hitObject, appearTime, disappearTime);
        });

        this.objectToHitMarkers = new Map();
    };

    MapState.HIT_OBJECT_VISIBILITY = { };
    MapState.HIT_OBJECT_HITABLE = { };

    MapState.HIT_MARKER_CREATION = { };

    MapState.fromMapInfo = function (mapInfo) {
        return new MapState(mapInfo.ruleSet, mapInfo.map.objects);
    };

    MapState.prototype = {
        getVisibleObjects: function (time) {
            return this.timeline.getAllAtTime(time, MapState.HIT_OBJECT_VISIBILITY);
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

                    this.timeline.add(MapState.HIT_MARKER_CREATION, hitMarker, time);

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
