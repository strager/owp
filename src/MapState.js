define('MapState', [ 'mapObject', 'Util/Timeline', 'Util/Map', 'Util/PubSub' ], function (mapObject, Timeline, Map, PubSub) {
    function MapState(ruleSet, objects, timeline) {
        this.ruleSet = ruleSet;
        this.timeline = timeline;
        this.events = new PubSub();

        this.objects = [ ];
        this.unhitObjects = [ ];

        objects.forEach(this.addHitObject, this);
    }

    MapState.HIT_OBJECT_VISIBILITY = 'hit object visibility';
    MapState.HIT_OBJECT_HITABLE = 'hit object hitable';

    MapState.HIT_MARKER_CREATION = 'hitmarker creation';

    MapState.fromMapInfo = function (mapInfo, timeline) {
        return new MapState(mapInfo.ruleSet, mapInfo.map.objects, timeline);
    };

    MapState.prototype = {
        addHitObject: function (hitObject) {
            var appearTime = this.ruleSet.getObjectStartAppearTime(hitObject);
            var disappearTime = this.ruleSet.getObjectEndDisappearTime(hitObject);
            this.timeline.add(MapState.HIT_OBJECT_VISIBILITY, hitObject, appearTime, disappearTime);

            this.objects.push(hitObject);

            mapObject.match(hitObject, {
                Slider: function (slider) {
                    var ticks = this.ruleSet.getSliderTicks(hitObject);
                    ticks.forEach(this.addHittableObject, this);
                    slider.ticks = ticks; // Temporary (I hope)

                    var ends = this.ruleSet.getSliderEnds(hitObject);
                    ends.forEach(this.addHittableObject, this);
                    slider.ends = ends; // Temporary (I hope)

                    this.addHittableObject(slider);
                },
                HitCircle: function (hitCircle) {
                    this.addHittableObject(hitCircle);
                }
            }, this);

            var earliestHitTime = this.ruleSet.getObjectEarliestHitTime(hitObject);
            var latestHitTime = this.ruleSet.getObjectLatestHitTime(hitObject);
            this.timeline.add(MapState.HIT_OBJECT_HITABLE, hitObject, earliestHitTime, latestHitTime);
        },

        addHittableObject: function (hitObject) {
            // TODO Proper insertion sort (History?)
            this.unhitObjects.push([ hitObject, this.ruleSet.getObjectLatestHitTime(hitObject) ]);
            this.unhitObjects = this.unhitObjects.sort(function (a, b) {
                return a[1] < b[1] ? -1 : 1;
            });
        },

        getVisibleObjects: function (time) {
            var hitObjects = this.timeline.getAllAtTime(time, MapState.HIT_OBJECT_VISIBILITY);
            var hitMarkers = this.timeline.getAllInTimeRange(time - 4000, time, MapState.HIT_MARKER_CREATION);

            return hitObjects.concat(hitMarkers);
        },

        getHittableObjects: function (time) {
            var rawHittables = this.timeline.getAllAtTime(time, MapState.HIT_OBJECT_HITABLE);

            return rawHittables.filter(this.isObjectHittable, this);
        },

        getUnhitObjectIndex: function (object) {
            var i;

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

        getActiveCombo: function (time) {
            var hitMarkers = this.timeline.getAllInTimeRange(0, time, MapState.HIT_MARKER_CREATION);

            return this.ruleSet.getActiveCombo(hitMarkers);
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
                        this.ruleSet.getHitScore(object, time),
                        true
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

            // Temporary (I hope)
            hitMarker.hitObject.hitMarker = hitMarker;
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

        hitSlide: function (object, mouseState) {
            if (!mapObject.match(object, { SliderTick: true, SliderEnd: true, _: false })) {
                return null;
            }

            var isHit = mouseState
             && (mouseState.left || mouseState.right)
             && this.ruleSet.canHitObject(
                    object,
                    mouseState.x,
                    mouseState.y,
                    object.time
                );

            // This should be in RuleSet, but =[
            var score = mapObject.match(object, {
                SliderTick: isHit ? 10 : 0,
                SliderEnd: function (object) {
                    if (!object.isFinal) {
                        return isHit ? 30 : 0;
                    }

                    var hittables = [ object.slider ].concat(object.slider.ends).concat(object.slider.ticks);

                    // At least one miss => at most 100 points
                    // 50% (?) or less misses => at most 50 points
                    // No hits => 0 points
                    // FIXME is the 50% correct?
                    var hits = 0;
                    var total = 0;

                    hittables.forEach(function (hittable) {
                        if (!hittable.hitMarker) {
                            return;
                        }

                        if (hittable.hitMarker.isHit) {
                            ++hits;
                        }

                        ++total;
                    });

                    // Account for this object (which doesn't
                    // have a hit marker yet)
                    if (isHit) {
                        ++hits;
                    }

                    ++total;

                    if (hits === 0) {
                        return 0;
                    } else if (hits === total) {
                        return 300;
                    } else if (hits < total / 2) {
                        return 50;
                    } else {
                        return 100;
                    }
                }
            });

            var hitMarker = new mapObject.HitMarker(
                object,
                object.time,
                score,
                isHit
            );

            return hitMarker;
        },

        processSlides: function (time, mouseHistory) {
            var removedUnhitObjects = [ ];

            var i;
            var unhitObject;
            var hitMarker;

            for (i = 0; i < this.unhitObjects.length; ++i) {
                unhitObject = this.unhitObjects[i];

                if (unhitObject[1] >= time) {
                    break;
                }

                hitMarker = this.hitSlide(
                    unhitObject[0],
                    mouseHistory.getDataAtTime(unhitObject[0].time)
                );

                if (hitMarker) {
                    this.applyHitMarkerNoRemove(hitMarker);

                    // We unshift because we need to remove objects in reverse
                    // order.  Else we need to keep track of index changes while
                    // removing items, which is ugly and slow.
                    removedUnhitObjects.push(i);
                }
            }

            removedUnhitObjects.forEach(function (index) {
                this.unhitObjects.splice(index, 1);
            }, this);
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
                    0,
                    false
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
