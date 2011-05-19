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

            // FIXME This won't work for the future
            var hitWindow = ruleSet.getHitWindow();
            var earliestHitTime = hitObject.time - hitWindow;
            var latestHitTime = hitObject.time + hitWindow;

            timeline.add(MapState.HIT_OBJECT_HITABLE, hitObject, earliestHitTime, latestHitTime);
        });

        this.objectToHitMarkers = new Map();

        this.unhitObjects = objects.slice(); // Copy array
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
            var rawHittables = this.timeline.getAllAtTime(time, MapState.HIT_OBJECT_HITABLE);
            var unhitObjects = this.unhitObjects;

            return rawHittables.filter(this.isObjectHittable, this);
        },

        isObjectHittable: function (object) {
            // If the object is unhit, it's hittable
            return this.unhitObjects.indexOf(object) >= 0;
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

            var unhitIndex;

            for (i = 0; i < hittableObjects.length; ++i) {
                object = hittableObjects[i];

                if (this.ruleSet.canHitObject(object, hit.x, hit.y, hit.time)) {
                    hitMarker = new HitMarker(object, hit.time);
                    hitMarker.score = this.ruleSet.getHitScore(object, hitMarker);

                    this.timeline.add(MapState.HIT_MARKER_CREATION, hitMarker, hit.time);

                    unhitIndex = this.unhitObjects.indexOf(object);

                    if (unhitIndex < 0) {
                        throw new Error('Bad map state; oh dear!');
                    }

                    this.unhitObjects.splice(unhitIndex, 1);

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
