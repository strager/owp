define('MapState', [ 'Util/Timeline', 'Util/Map', 'HitMarker', 'Util/PubSub' ], function (Timeline, Map, HitMarker, PubSub) {
    var MapState = function (ruleSet, objects) {
        this.ruleSet = ruleSet;

        this.events = new PubSub();

        this.events.subscribe(MapState.HIT_MADE, this.reactToHit.bind(this));

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

    MapState.HIT_MADE = { };

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
            this.events.publish(MapState.HIT_MADE, { x: x, y: y, time: time });
        },

        reactToHit: function (hit) {
            var hittableObjects = this.getHittableObjects(hit.time).sort(function (a, b) {
                // Sort by time ascending
                return a.time < b.time ? -1 : 1;
            });

            var i, object;
            var hitMarker;

            for (i = 0; i < hittableObjects.length; ++i) {
                object = hittableObjects[i];

                if (this.ruleSet.canHitObject(object, hit.x, hit.y, hit.time)) {
                    hitMarker = new HitMarker(object, hit.time);
                    hitMarker.score = this.ruleSet.getHitScore(object, hitMarker);

                    this.timeline.add(MapState.HIT_MARKER_CREATION, hitMarker, hit.time);

                    // TODO Multi-map
                    if (this.objectToHitMarkers.contains(object)) {
                        this.objectToHitMarkers.get(object).push(hitMarker);
                    } else {
                        this.objectToHitMarkers.set(object, [ hitMarker ]);
                    }

                    return;
                }
            }
        }
    };

    return MapState;
});
