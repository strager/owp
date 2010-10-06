exports.$ = (function () {
    var TimedMap = require('owp/Util/TimedMap').$;
    var Map = require('owp/Util/Map').$;
    var HitObjectHit = require('owp/HitObjectHit').$;

    var MapState = function (ruleSet, objects) {
        this.ruleSet = ruleSet;

        this.objectMap = new TimedMap();
        this.objectMap.spawnMany(objects);

        this.hits = new TimedMap();
        this.objectToHits = new Map();
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
            var hit;

            for (i = 0; i < hittableObjects.length; ++i) {
                object = hittableObjects[i];

                if (this.ruleSet.canHitObject(object, x, y, time)) {
                    hit = new HitObjectHit(object, time);
                    hit.score = this.ruleSet.getHitScore(object, hit);

                    this.hits.spawn(hit);

                    // TODO Multi-map
                    if (this.objectToHits.contains(object)) {
                        this.objectToHits.get(object).push(hit);
                    } else {
                        this.objectToHits.set(object, [ hit ]);
                    }

                    return hit;
                }
            }

            return null;
        }
    };

    return MapState;
}());
