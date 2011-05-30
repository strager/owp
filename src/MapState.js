define('MapState', [ 'Util/Timeline', 'Util/Map', 'HitMarker', 'Util/PubSub' ], function (Timeline, Map, HitMarker, PubSub) {
    var MapState = function (ruleSet, objects) {
        var reactToHit = function (hit) {
            var hittableObjects = this.getHittableObjects(hit.time);

            var i, object;
            var hitMarker;

            for (i = 0; i < hittableObjects.length; ++i) {
                object = hittableObjects[i];

                if (this.ruleSet.canHitObject(object, hit.x, hit.y, hit.time)) {
                    hitMarker = HitMarker.create(
                        object,
                        hit.time,
                        this.ruleSet
                    );

                    this.applyHitMarker(hitMarker);

                    return;
                }
            }
        };

        this.ruleSet = ruleSet;

        this.events = new PubSub();
        this.events.subscribe(MapState.HIT_MADE, reactToHit.bind(this));

        var timeline = this.timeline = new Timeline();

        objects.forEach(function (hitObject) {
            var appearTime = ruleSet.getObjectAppearTime(hitObject);
            var disappearTime = ruleSet.getObjectDisappearTime(hitObject);

            timeline.add(MapState.HIT_OBJECT_VISIBILITY, hitObject, appearTime, disappearTime);

            // FIXME This won't work for the future
            //   ... Why not?
            var earliestHitTime = ruleSet.getObjectEarliestHitTime(hitObject);
            var latestHitTime = ruleSet.getObjectLatestHitTime(hitObject);

            timeline.add(MapState.HIT_OBJECT_HITABLE, hitObject, earliestHitTime, latestHitTime);
        });

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

        clickAt: function (x, y, time) {
            this.events.publish(MapState.HIT_MADE, { x: x, y: y, time: time });
        },

        applyHitMarker: function (hitMarker) {
            var unhitIndex = this.unhitObjects.indexOf(hitMarker.hitObject);

            if (unhitIndex < 0) {
                throw new Error('Bad map state; oh dear!');
            }

            // Object is now hit; remove it from unhit objects list
            this.unhitObjects.splice(unhitIndex, 1);

            // Add hit marker itself to the timeline
            this.timeline.add(MapState.HIT_MARKER_CREATION, hitMarker, hitMarker.time);
        },

        processMisses: function (time) {
            var self = this;

            var missedObjects = this.unhitObjects.filter(function (object) {
                return self.ruleSet.getObjectLatestHitTime(object) < time;
            });

            missedObjects.forEach(function (object) {
                var hitMarker = new HitMarker(
                    object,
                    self.ruleSet.getObjectLatestHitTime(object) + 1,
                    0
                );

                self.applyHitMarker(hitMarker);
            });
        }
    };

    return MapState;
});
