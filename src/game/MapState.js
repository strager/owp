define('game/MapState', [ 'game/mapObject', 'util/Timeline', 'util/Map', 'util/PubSub' ], function (mapObject, Timeline, Map, PubSub) {
    function MapState(ruleSet, objects, timeline) {
        this.ruleSet = ruleSet;
        this.timeline = timeline;

        this.events = {
            hitMarker: new PubSub()
        };

        function addClickable(object) {
            var earliestHitTime = this.ruleSet.getObjectEarliestHitTime(object);
            var latestHitTime = this.ruleSet.getObjectLatestHitTime(object);
            this.timeline.add(MapState.HIT_OBJECT_HITABLE, object, earliestHitTime, latestHitTime);
        }

        function addRenderable(object) {
            var appearTime = this.ruleSet.getObjectStartAppearTime(object);
            var disappearTime = this.ruleSet.getObjectEndDisappearTime(object);
            this.timeline.add(MapState.HIT_OBJECT_VISIBILITY, object, appearTime, disappearTime);
        }

        function addSlidable(object) {
            this.timeline.add(MapState.HIT_SLIDE_CHECK, object, object.time + 1);
        }

        function addMissable(object) {
            var latestHitTime = this.ruleSet.getObjectLatestHitTime(object);
            this.timeline.add(MapState.HIT_MISS_CHECK, object, latestHitTime + 1);
        }

        objects.forEach(function (object) {
            mapObject.match(object, {
                HitCircle: addRenderable,
                Slider: addRenderable
            }, this);

            mapObject.match(object, {
                HitCircle: addClickable,
                Slider: addClickable
            }, this);

            mapObject.match(object, {
                SliderEnd: addSlidable,
                SliderTick: addSlidable
            }, this);

            mapObject.match(object, {
                HitCircle: addMissable
            }, this);
        }, this);
    }

    MapState.HIT_OBJECT_VISIBILITY = 'hit object visibility';
    MapState.HIT_OBJECT_HITABLE = 'hit object hitable';

    MapState.HIT_SLIDE_CHECK = 'hit slide check';
    MapState.HIT_MISS_CHECK = 'hit miss check';

    MapState.HIT_MARKER_CREATION = 'hitmarker creation';

    MapState.fromMapInfo = function (mapInfo, timeline) {
        return new MapState(mapInfo.ruleSet, mapInfo.getAllObjects(), timeline);
    };

    MapState.prototype = {
        getVisibleObjects: function (time) {
            var hitObjects = this.timeline.getAllAtTime(time, MapState.HIT_OBJECT_VISIBILITY);
            var hitMarkers = this.timeline.getAllInTimeRange(time - 4000, time, MapState.HIT_MARKER_CREATION);

            return hitObjects.concat(hitMarkers);
        },

        getHittableObjects: function (time) {
            var rawHittables = this.timeline.getAllAtTime(time, MapState.HIT_OBJECT_HITABLE);

            return rawHittables.filter(this.isObjectHittable, this);
        },

        isObjectHittable: function (object) {
            return !object.hitMarker;
        },

        getAccuracy: function (time) {
            var hitMarkers = this.timeline.getAllInTimeRange(0, time, MapState.HIT_MARKER_CREATION);

            return this.ruleSet.getTotalAccuracy(hitMarkers);
        },

        getScore: function (time) {
            var hitMarkers = this.timeline.getAllInTimeRange(0, time, MapState.HIT_MARKER_CREATION);

            return this.ruleSet.getTotalScore(hitMarkers);
        },

        getAllHitMarkers: function () {
            return this.timeline.getAllInTimeRange(-Infinity, Infinity, MapState.HIT_MARKER_CREATION);
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

        applyHitMarker: function (hitMarker) {
            hitMarker.hitObject.hitMarker = hitMarker;

            // Add hit marker itself to the timeline
            this.timeline.add(MapState.HIT_MARKER_CREATION, hitMarker, hitMarker.time);

            this.events.hitMarker.publishSync(hitMarker);
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

        processSlide: function (object, mouseHistory) {
            if (object.hitMarker) {
                return;
            }

            hitMarker = this.hitSlide(
                object,
                mouseHistory.getDataAtTime(object.time)
            );

            if (!hitMarker) {
                throw new Error('Bad state');
            }

            this.applyHitMarker(hitMarker);
        },

        processMiss: function (object) {
            if (object.hitMarker) {
                return;
            }

            var latestHitTime = this.ruleSet.getObjectLatestHitTime(object);
            hitMarker = new mapObject.HitMarker(
                object,
                latestHitTime,
                0,
                false
            );

            this.applyHitMarker(hitMarker);
        }
    };

    return MapState;
});
