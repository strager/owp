define('MapState', [ 'mapObject', 'Util/Timeline', 'Util/Map', 'Util/PubSub' ], function (mapObject, Timeline, Map, PubSub) {
    var MapState = function (ruleSet, objects, timeline) {
        this.ruleSet = ruleSet;
        this.timeline = timeline;

        this.events = new PubSub();

        var hittableObjects = [ ];

        objects.forEach(function (hitObject) {
            var appearTime = ruleSet.getObjectAppearTime(hitObject);
            var disappearTime = ruleSet.getObjectDisappearTime(hitObject);

            timeline.add(MapState.HIT_OBJECT_VISIBILITY, hitObject, appearTime, disappearTime);

            // FIXME This won't work for the future
            //   ... Why not?
            var earliestHitTime = ruleSet.getObjectEarliestHitTime(hitObject);
            var latestHitTime = ruleSet.getObjectLatestHitTime(hitObject);

            timeline.add(MapState.HIT_OBJECT_HITABLE, hitObject, earliestHitTime, latestHitTime);

            mapObject.match(hitObject, {
                Slider: function (slider) {
                    var ticks = ruleSet.getSliderTicks(hitObject);
                    hittableObjects = hittableObjects.concat(ticks);
                    slider.ticks = ticks; // Temporary (I hope)

                    var ends = ruleSet.getSliderEnds(hitObject);
                    hittableObjects = hittableObjects.concat(ends);
                    slider.ends = ends; // Temporary (I hope)
                },
                HitCircle: function (hitCircle) {
                    hittableObjects.push(hitCircle);
                }
            });
        });

        this.unhitObjects = hittableObjects.map(function (hitObject) {
            return [ hitObject, ruleSet.getObjectLatestHitTime(hitObject) ];
        }).sort(function (a, b) {
            return a[1] < b[1] ? -1 : 1;
        });
    };

    MapState.HIT_OBJECT_VISIBILITY = 'hit object visibility';
    MapState.HIT_OBJECT_HITABLE = 'hit object hitable';

    MapState.HIT_MARKER_CREATION = 'hitmarker creation';

    MapState.fromMapInfo = function (mapInfo, timeline) {
        return new MapState(mapInfo.ruleSet, mapInfo.map.objects, timeline);
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

        getUnhitObjectIndex: function (object) {
            var i;

            // Object is now hit; remove it from unhit objects list
            for (i = 0; i < this.unhitObjects.length; ++i) {
                if (this.unhitObjects[i][0] === object) {
                    return i;
                }
            }

            return -1;
        },

        isObjectHittable: function (object) {
            // If the object is unhit, it's hittable
            return this.getUnhitObjectIndex(object) >= 0;
        },

        getAccuracy: function (time) {
            var hitMarkers = this.timeline.getAllInTimeRange(0, time, MapState.HIT_MARKER_CREATION);

            return this.ruleSet.getTotalAccuracy(hitMarkers);
        },

        getScore: function (time) {
            var hitMarkers = this.timeline.getAllInTimeRange(0, time, MapState.HIT_MARKER_CREATION);

            return this.ruleSet.getTotalScore(hitMarkers);
        },

        clickAt: function (x, y, time) {
            var hittableObjects = this.getHittableObjects(time);

            var i, object;
            var hitMarker;

            for (i = 0; i < hittableObjects.length; ++i) {
                object = hittableObjects[i];

                if (this.ruleSet.canHitObject(object, x, y, time)) {
                    hitMarker = new mapObject.HitMarker(
                        object,
                        time,
                        this.ruleSet.getHitScore(object, time)
                    );

                    this.applyHitMarker(hitMarker);

                    return;
                }
            }
        },

        applyHitMarkerNoRemove: function (hitMarker) {
            // Add hit marker itself to the timeline
            this.timeline.add(MapState.HIT_MARKER_CREATION, hitMarker, hitMarker.time);

            this.events.publishSync(hitMarker);
        },

        applyHitMarker: function (hitMarker, removeObject) {
            // Object is now hit; remove it from unhit objects list
            var index = this.getUnhitObjectIndex(hitMarker.hitObject);

            if (index < 0) {
                throw new Error('Bad map state; oh dear!');
            }

            this.unhitObjects.splice(index, 1);

            this.applyHitMarkerNoRemove(hitMarker);
        },

        processSlides: function (time, mouseHistory) {
            var removedUnhitObjects = [ ];

            var i;
            var unhitObject;
            var hitMarker;
            var mouseState = null;
            var score;

            for (i = 0; i < this.unhitObjects.length; ++i) {
                unhitObject = this.unhitObjects[i];

                if (unhitObject[1] >= time) {
                    break;
                }

                if (!mapObject.match(unhitObject[0], { SliderTick: true, SliderEnd: true, _: false })) {
                    continue;
                }

                mouseState = mouseHistory.getDataAtTime(unhitObject[0].time);

                if (mouseState && (mouseState.left || mouseState.right)) {
                    if (this.ruleSet.canHitObject(
                        unhitObject[0],
                        mouseState.x,
                        mouseState.y,
                        unhitObject[0].time
                    )) {
                        // Hit
                        score = mapObject.match(unhitObject[0], { SliderTick: 10, SliderEnd: 30 });
                    } else {
                        // Miss
                        score = 0;
                    }
                } else {
                    score = 0;
                }

                hitMarker = new mapObject.HitMarker(
                    unhitObject[0],
                    unhitObject[0].time,
                    score
                );

                unhitObject[0].hitMarker = hitMarker; // Temporary (I hope)

                this.applyHitMarkerNoRemove(hitMarker);

                removedUnhitObjects.push(i);
            }

            // We iterate backwards because otherwise we have to
            // keep track of index changes while removing items.
            for (i = removedUnhitObjects.length; i --> 0; ) {
                this.unhitObjects.splice(removedUnhitObjects[i], 1);
            }
        },

        processMisses: function (time) {
            var i;
            var unhitObject;
            var hitMarker;

            for (i = 0; i < this.unhitObjects.length; ++i) {
                unhitObject = this.unhitObjects[i];

                if (unhitObject[1] >= time) {
                    break;
                }

                hitMarker = new mapObject.HitMarker(
                    unhitObject[0],
                    unhitObject[1] + 1,
                    0
                );

                this.applyHitMarkerNoRemove(hitMarker);
            }

            // i has the number of unhit objects which were
            // processed.  We need to remove them ourselves
            // (because we called applyHitMarkerNoRemove).
            this.unhitObjects.splice(0, i);
        }
    };

    return MapState;
});
