define('game/RuleSet', [ 'util/util', 'game/mapObject', 'util/History', 'util/CueList', 'util/ease' ], function (util, mapObject, History, CueList, ease) {
    function RuleSet() {
        this.approachRate = 5;
        this.overallDifficulty = 5;
        this.hpDrain = 5;
        this.circleSize = 5;
        this.stackLeniency = 1;
        this.sliderMultiplier = 1;
        this.sliderTickRate = 1;

        this.uninheritedTimingPointHistory = new History();
        this.inheritedTimingPointHistory = new History();

        this.breakTimeline = new CueList();

        this.breakinessTransitionDuration = 300;
    }

    RuleSet.fromSettings = function (settings) {
        var ruleSet = new RuleSet();

        var fields = (
            'approachRate,overallDifficulty,hpDrain,circleSize,sliderMultiplier,sliderTickRate,stackLeniency,audioLeadIn'
        ).split(',');

        util.extendObjectWithFields(ruleSet, fields, settings);

        // TODO Peek at version?
        if (typeof settings.approachRate === 'undefined') {
            ruleSet.approachRate = ruleSet.overallDifficulty;
        }

        settings.timingPoints.forEach(function (timingPoint) {
            if (timingPoint.isInherited) {
                ruleSet.inheritedTimingPointHistory.add(timingPoint.time, timingPoint);
            } else {
                ruleSet.uninheritedTimingPointHistory.add(timingPoint.time, timingPoint);
            }
        });

        settings.breakRanges.forEach(function (breakRange) {
            ruleSet.breakTimeline.add(breakRange, breakRange.startTime, breakRange.endTime);
        });

        return ruleSet;
    };

    function ruleLerp(a, b, c, value) {
        return ease.table(ease.lerp, [
            [ 0, a ],
            [ 5, b ],
            [ 10, c ]
        ], value);
    }

    RuleSet.prototype = {
        getAppearTime: mapObject.matcher({
            HitMarker: function () {
                return 0;
            },
            _: function () {
                return ruleLerp(1800, 1200, 450, this.approachRate);
            }
        }),

        getObjectStartAppearTime: function (object) {
            return this.getObjectStartTime(object) - this.getAppearTime(object);
        },

        getObjectEndAppearTime: function (object) {
            var appearTime = this.getObjectStartAppearTime(object);
            var startTime = this.getObjectStartTime(object);

            return (appearTime * 2 + startTime * 1) / 3;
        },

        getObjectStartDisappearTime: mapObject.matcher({
            Slider: function (object) {
                return this.getObjectEndTime(object);
            },
            HitMarker: function (object) {
                return this.getObjectStartTime(object) + 600;
            },
            _: function (object) {
                if (object.hitMarker) {
                    return object.hitMarker.time;
                } else {
                    return this.getObjectLatestHitTime(object);
                }
            }
        }),

        getObjectEndDisappearTime: mapObject.matcher({
            HitMarker: function (object) {
                return this.getObjectStartTime(object) + 900;
            },
            _: function (object) {
                var disappearTime = this.getObjectStartDisappearTime(object);

                return disappearTime + 200;
            }
        }),

        getObjectStartTime: mapObject.matcher({
            SliderTick: function (object) {
                return this.getObjectStartTime(object.slider);
            },
            _: function (object) {
                return object.time;
            }
        }),

        getObjectEndTime: mapObject.matcher({
            Slider: function (object) {
                var duration = object.repeats * this.getSliderRepeatLength(object.time, object.length);
                return this.getObjectStartTime(object) + duration;
            },
            HitCircle: function (object) {
                return this.getObjectStartTime(object);
            },
            _: function (object) {
                return object.time;
            }
        }),

        getSliderRepeatLength: function (time, sliderLength) {
            return 1000 * sliderLength / this.getEffectiveSliderSpeed(time);
        },

        /*
         * 'before', 'appearing', 'during', 'disappearing', or 'after'
         */
        getObjectVisibilityAtTime: function (object, time) {
            var appearTime    = this.getObjectStartAppearTime(object);
            var startTime     = this.getObjectStartTime(object);
            var endTime       = this.getObjectEndTime(object);
            var disappearTime = this.getObjectEndDisappearTime(object);

            if (time < appearTime) {
                return 'before';
            } else if (time < startTime) {
                return 'appearing';
            } else if (time < endTime) {
                return 'during';
            } else if (time < disappearTime) {
                return 'disappearing';
            } else {
                return 'after';
            }
        },

        getApproachCircleOpacity: function (object, time) {
            return this.getObjectOpacity(object, time);
        },

        getObjectOpacity: function (object, time) {
            var startAppearTime    = this.getObjectStartAppearTime(object);
            var endAppearTime      = this.getObjectEndAppearTime(object);
            var startTime          = this.getObjectStartTime(object);
            var startDisappearTime = this.getObjectStartDisappearTime(object);
            var endDisappearTime   = this.getObjectEndDisappearTime(object);

            if (time < startAppearTime) {
                return 0;
            } else if (time < endAppearTime) {
                return (time - startAppearTime) / (endAppearTime - startAppearTime);
            } else if (time < startTime) {
                return 1;
            } else if (time < startDisappearTime) {
                return 1;
            } else if (time < endDisappearTime) {
                return 1 - (time - startDisappearTime) / (endDisappearTime - startDisappearTime);
            } else {
                return 0;
            }
        },

        getSliderGrowPercentage: function (object, time) {
            var startAppearTime = this.getObjectStartAppearTime(object);
            var endAppearTime   = this.getObjectEndAppearTime(object);

            if (time < startAppearTime) {
                return 0;
            } else if (time < endAppearTime) {
                return Math.sqrt((time - startAppearTime) / (endAppearTime - startAppearTime));
            } else {
                return 1;
            }
        },

        getObjectApproachProgress: function (object, time) {
            var startAppearTime = this.getObjectStartAppearTime(object);
            var startTime       = this.getObjectStartTime(object);
            var endTime         = this.getObjectEndTime(object);
            var approachEndTime = endTime + 40;

            if (time < startAppearTime) {
                return 0;
            } else if (time < startTime) {
                return (time - startAppearTime) / (startTime - startAppearTime);
            } else if (time < endTime) {
                return 1;
            } else if (time <= approachEndTime) {
                return ((time - endTime) / (approachEndTime - endTime)) - 1;
            } else {
                return 0;
            }
        },

        getObjectEarliestHitTime: function (object) {
            return object.time - this.getHitWindow(0);
        },

        getObjectLatestHitTime: mapObject.matcher({
            HitCircle: function (object) {
                return object.time + this.getHitWindow(50);
            },
            Slider: function (object) {
                return object.time + this.getHitWindow(50);
            },
            _: function (object) {
                return this.getObjectEndTime(object);
            }
        }),

        canHitObject: function (object, x, y, time) {
            var distance = Math.pow(object.x - x, 2) + Math.pow(object.y - y, 2);
            var radius = this.getHitRadius(object);

            return distance <= radius * radius;
        },

        // Gives diameter
        getCircleSize: function () {
            return -(this.circleSize - 5) * 16 + 64;
        },

        getSliderSize: function () {
            return this.getCircleSize() * 2;
        },

        getSliderTrackWidth: function () {
            var adjustmentScale = 128 / (128 - 10); // Don't ask...
            return this.getCircleSize() / adjustmentScale / 2;
        },

        getHitRadius: mapObject.matcher({
            HitCircle: function (object) {
                return this.getCircleSize() / 2;
            },
            Slider: function (object) {
                return this.getCircleSize() / 2;
            },
            SliderTick: function (object) {
                return this.getSliderSize() / 2;
            },
            SliderEnd: function (object) {
                return this.getSliderSize() / 2;
            }
        }),

        getSliderTickThresholdRadius: function () {
            return this.getCircleSize();
        },

        getHitMarkerImageName: function (hitMarker) {
            // Should this be here?

            var imageNames = {
                300: 'hit300.png',
                100: 'hit100.png',
                50: 'hit50.png',
                30: 'sliderpoint30.png',
                10: 'sliderpoint10.png',
                0: 'hit0.png'
            };

            var ignore = mapObject.match(hitMarker.hitObject, {
                SliderTick: function () {
                    return hitMarker.score === 0;
                },
                SliderEnd: function (object) {
                    return !object.isFinal && hitMarker.score === 0;
                },
                Slider: function () {
                    return hitMarker.score === 0;
                }
            });

            if (ignore) {
                return null;
            }

            if (!imageNames.hasOwnProperty(hitMarker.score)) {
                throw new Error('Invalid hit marker with score ' + hitMarker.score);
            }

            return imageNames[hitMarker.score];
        },

        getHitWindow: function (score) {
            var windows = {
                300: [  80,  50,  20 ],
                100: [ 140, 100,  60 ],
                50:  [ 200, 150, 100 ],
                0:   [ 260, 200, 140 ]  // FIXME Just a guess
            };

            if (!windows.hasOwnProperty(score)) {
                throw new Error('score must be one of: ' + Object.keys(windows).join(', '));
            }

            var window = windows[score];

            return ruleLerp(window[0], window[1], window[2], this.overallDifficulty);
        },

        getHitScore: function (object, time) {
            return mapObject.match(object, {
                HitCircle: function (object) {
                    var delta = Math.abs(this.getObjectEndTime(object) - time);

                    var scores = [ 300, 100, 50, 0 ];
                    var i;

                    for (i = 0; i < scores.length; ++i) {
                        if (delta <= this.getHitWindow(scores[i])) {
                            return scores[i];
                        }
                    }

                    return 0;   // TODO Return "shouldn't be hit" or throw or something
                },
                Slider: 0
                // TODO Move SliderTick, SliderEnd from
                // MapState#hitSlide to here
            }, this);
        },

        getHitMarkerScale: function (hitMarker, time) {
            var offset = time - hitMarker.time;

            return ease.table(ease.smoothstep, [
                [ 0, 0.5 ],
                [ 20, 0.55 ],
                [ 200, 0.5 ]
            ], offset);
        },

        getRepeatArrowScale: function (sliderEnd, time) {
            var beat = this.getMeasureBeatAtTime(time);

            return 1 + (beat % 1) / 6;
        },

        getMeasureBeatAtTime: function (time) {
            var timingSection = this.uninheritedTimingPointHistory.getDataAtTime(time) || this.uninheritedTimingPointHistory.getFirst();

            // TODO Configurable measure length
            var measureLength = 4;

            var offset = time - timingSection.time;
            var beatTime = 60 * 1000 / timingSection.bpm;

            return (offset / beatTime) % measureLength;
        },

        getHitSoundNames: function (hitMarker) {
            // osu!'s hitsound sections are based on the hitsound time; we
            // choose to use the hit object's time, as that makes more sense
            // and is probably what the mapper intended.
            var time = hitMarker.hitObject.time;

            // TODO Custom hitsounds
            var prefix = this.getLastTimingSection(time).sampleSet + '-';
            var suffix = '.wav';

            if (!hitMarker.isHit) {
                return [ ];
            }

            return hitMarker.hitObject.hitSounds.map(function (hitSound) {
                return prefix + hitSound + suffix;
            });
        },

        doesObjectAffectAccuracy: mapObject.matcher({
            HitCircle: true,
            SliderEnd: function (object) {
                return object.isFinal;
            },
            _: false
        }),

        getTotalAccuracy: function (hitMarkers) {
            var maxScoreValue = 0;
            var currentScoreValue = 0;

            hitMarkers.forEach(function (hitMarker) {
                if (!this.doesObjectAffectAccuracy(hitMarker.hitObject)) {
                    return;
                }

                maxScoreValue += 300;
                currentScoreValue += hitMarker.score;
            }, this);

            if (!maxScoreValue) {
                return 0;
            }

            return currentScoreValue / maxScoreValue;
        },

        getTotalScore: function (hitMarkers) {
            hitMarkers = hitMarkers.sort(function (a, b) {
                return a.time > b.time ? 1 : -1;
            });

            // TODO Calculate these multipliers
            var difficultyMultiplier = 4;
            var modMultiplier = 1;

            var currentCombo = 0;
            var currentScore = 0;

            hitMarkers.forEach(function (hitMarker) {
                if (hitMarker.isMiss) {
                    currentCombo = 0;
                    return;
                }

                if (!this.doesObjectAffectAccuracy(hitMarker.hitObject)) {
                    currentScore += hitMarker.score;
                    return;
                }

                currentScore += hitMarker.score * (1 + (
                    Math.max(currentCombo - 1, 0) *
                    difficultyMultiplier *
                    modMultiplier
                ) / 25);

                if (hitMarker.isHit) {
                    ++currentCombo;
                }
            }, this);

            return currentScore;
        },

        getHitMarkerHistogram: function (hitMarkers) {
            var hit300 = 0;
            var hit100 = 0;
            var hit50 = 0;
            var hit0 = 0;

            hitMarkers.forEach(function (hitMarker) {
                switch (this.getHitMarkerImageName(hitMarker)) {
                case 'hit300.png':
                    ++hit300;
                    break;
                case 'hit100.png':
                    ++hit100;
                    break;
                case 'hit50.png':
                    ++hit50;
                    break;
                case 'hit0.png':
                    ++hit0;
                    break;
                default:
                    // Ignore
                    break;
                }
            }, this);

            return {
                hit300: hit300,
                hit100: hit100,
                hit50: hit50,
                hit0: hit0
            };
        },

        getTotalRank: function (hitMarkers) {
            var hist = this.getHitMarkerHistogram(hitMarkers);

            if (hist.hit100 === 0 && hist.hit50 === 0 && hist.hit0 === 0) {
                return 'x';
            }

            var total = hist.hit300 + hist.hit100 + hist.hit50 + hist.hit0;

            if ((hist.hit300 / total) > 0.90 && (hist.hit50 / total) < 0.01 && hist.hit0 === 0) {
                return 's';
            }

            if (((hist.hit300 / total) > 0.80 && hist.hit0 === 0) || (hist.hit300 / total) > 0.90) {
                return 'a';
            }

            if (((hist.hit300 / total) > 0.70 && hist.hit0 === 0) || (hist.hit300 / total) > 0.80) {
                return 'b';
            }

            if ((hist.hit300 / total) > 0.60) {
                return 'c';
            }

            return 'd';
        },

        getActiveCombo: function (hitMarkers) {
            hitMarkers = hitMarkers.sort(function (a, b) {
                return a.time > b.time ? 1 : -1;
            });

            // We could optimize this by iterating backwards...
            // Or by keeping state between calls like everybody else.

            return hitMarkers.reduce(function (a, hitMarker) {
                if (hitMarker.isHit) {
                    return a + 1;
                } else if (hitMarker.isMiss) {
                    return 0;
                } else {
                    return a;
                }
            }, 0);
        },

        getObjectsByZ: function (objects) {
            var hitMarkers = [ ];
            var hitObjects = [ ];

            objects.forEach(mapObject.matcher({
                HitMarker: function (object) {
                    hitMarkers.push(object);
                },
                _: function (object) {
                    hitObjects.push(object);
                }
            }));

            function sort(a, b) {
                // Sort by time descending
                return a.time > b.time ? -1 : 1;
            }

            hitObjects = hitObjects.sort(sort);
            hitMarkers = hitMarkers.sort(sort);

            return hitObjects.concat(hitMarkers);
        },

        getEffectiveSliderSpeed: function (time) {
            // Gives osu!pixels per second

            // Beats per minute
            var bpm = this.getEffectiveBPM(time);

            // 100ths of osu!pixels per beat
            var velocity = this.sliderMultiplier;

            // (beats/minute) * ((1/100) pixel/beat) = (1/100) pixel/minute
            var pixelsPerMinute = bpm * velocity * 100;

            return pixelsPerMinute / 60; // Pixels per second
        },

        getSliderTicks: function (slider) {
            var startTime = this.getObjectStartTime(slider);
            var repeatDuration = this.getSliderRepeatLength(slider.time, slider.length);

            var tickLength = this.getTickLength(startTime);
            var tickDuration = this.getTickDuration(startTime);

            var radius = this.getSliderTickThresholdRadius();
            var radius2 = radius * radius;

            var startPosition = slider.curve.getStartPoint();
            var endPosition = slider.curve.getEndPoint();

            var rawTickPositions = slider.getTickPositions(tickLength);
            rawTickPositions = rawTickPositions.filter(function (point) {
                var dx, dy;

                dx = point[0] - startPosition[0];
                dy = point[1] - startPosition[1];
                if (dx * dx + dy * dy <= radius2) {
                    return false;
                }

                dx = point[0] - endPosition[0];
                dy = point[1] - endPosition[1];
                if (dx * dx + dy * dy <= radius2) {
                    return false;
                }

                return true;
            }, this);

            var ticks = [ ];

            var repeatIndex;

            function makeTick(tickPosition, tickIndex) {
                return new mapObject.SliderTick(
                    startTime + (tickIndex + 1) * tickDuration + repeatIndex * repeatDuration,
                    tickPosition[0],
                    tickPosition[1],
                    slider,
                    repeatIndex
                );
            }

            for (repeatIndex = 0; repeatIndex < slider.repeats; ++repeatIndex) {
                ticks = ticks.concat(rawTickPositions.map(makeTick));

                rawTickPositions = rawTickPositions.reverse();
            }

            return ticks;
        },

        getSliderEnds: function (slider) {
            var startTime = this.getObjectStartTime(slider);
            var repeatDuration = this.getSliderRepeatLength(slider.time, slider.length);

            var startPosition = slider.curve.getStartPoint();
            var endPosition = slider.curve.getEndPoint();

            var ends = [ ];

            var i;

            for (i = 1; i <= slider.repeats; ++i) {
                ends.push(new mapObject.SliderEnd(
                    startTime + i * repeatDuration,
                    slider,
                    i,
                    i === slider.repeats,
                    slider.endHitSounds[i] || slider.hitSounds
                ));
            }

            return ends;
        },

        getTickLength: function (time) {
            // 100ths of osu!pixels per beat
            var velocity = this.sliderMultiplier;

            // Beats per tick
            var beatsPerTick = 1 / this.sliderTickRate;

            // ((1/100) pixels/beat) * (beats/tick) = (1/100) pixels/tick
            var pixelsPerTick = velocity * beatsPerTick * 100;

            return pixelsPerTick;
        },

        getTickDuration: function (time) {
            // Beats per minute
            var bpm = this.getEffectiveBPM(time);

            // Beats per tick
            var beatsPerTick = 1 / this.sliderTickRate;

            // (beats/tick) / (beats/minute) = (minutes/tick)
            var minutesPerTick = beatsPerTick / bpm;

            return minutesPerTick * 60 * 1000; // Milliseconds per tick
        },

        getEffectiveBPM: function (time) {
            var inherited = this.inheritedTimingPointHistory.getDataAtTime(time);
            var uninherited = this.uninheritedTimingPointHistory.getDataAtTime(time) || this.uninheritedTimingPointHistory.getFirst();

            if (inherited && inherited.time >= uninherited.time) {
                return inherited.getEffectiveBPM(uninherited);
            } else {
                return uninherited.getEffectiveBPM(null);
            }
        },

        getLastTimingSection: function (time) {
            var inherited = this.inheritedTimingPointHistory.getDataAtTime(time) || this.inheritedTimingPointHistory.getFirst(null);
            var uninherited = this.uninheritedTimingPointHistory.getDataAtTime(time) || this.uninheritedTimingPointHistory.getFirst();

            if (inherited && inherited.time > uninherited.time) {
                return inherited;
            } else {
                return uninherited;
            }
        },

        getHitSoundVolume: function (time) {
            // Note that osu! uses the hit marker time itself, where we use
            // the more mapper-friendly hit object time.
            return this.getLastTimingSection(time).hitSoundVolume;
        },

        getObjectBoundingRectangle: mapObject.matcher({
            Slider: util.memoize(function (slider) {
                var radius = this.getCircleSize() / 2;
                var points = slider.curve.flattenContourPoints(radius);

                var minX = Infinity, minY = Infinity;
                var maxX = -Infinity, maxY = -Infinity;

                var min = Math.min;
                var max = Math.max;

                var i;
                for (i = 0; i < points.length; ++i) {
                    var p = points[i];

                    minX = min(minX, p[0]);
                    minY = min(minY, p[1]);

                    maxX = max(maxX, p[0]);
                    maxY = max(maxY, p[1]);
                }

                return [ minX, minY, maxX - minX, maxY - minY ];
            }),
            HitCircle: function (hitCircle) {
                // The only thing easier is an AA rectangle...

                var radius = this.getCircleSize() / 2;

                return [
                    hitCircle.x - radius, hitCircle.y - radius,
                    radius * 2, radius * 2
                ];
            },
            _: function () {
                // TODO
                throw new Error('Not implemented');
            }
        }),

        isComboNumberVisible: function (object, time) {
            return mapObject.match(object, {
                Slider: function () {
                    return time <= object.time;
                },
                _: true
            });
        },

        getObjectStartPosition: function (object) {
            return {
                x: object.x,
                y: object.y
            };
        },

        getObjectEndPosition: mapObject.matcher({
            Slider: function (object) {
                if (object.repeats % 2) {
                    // Odd number of repeats => end of slider
                    var end = object.curve.getEndPoint();

                    return {
                        x: end[0],
                        y: end[1]
                    };
                } else {
                    // Even number of repeats => start of slider
                    return {
                        x: object.x,
                        y: object.y
                    };
                }
            },
            _: function (object) {
                return {
                    x: object.x,
                    y: object.y
                };
            }
        }),

        applyNoteStacking: function (objects) {
            // Maximum number of osu!pixels between two objects
            var leniencyDistance = 3;

            // Maximum number of milliseconds between two objects
            var leniencyTime = this.stackLeniency * this.getAppearTime();

            function canStack(top, bottom) {
                var timeDistance = this.getObjectStartTime(bottom) - this.getObjectEndTime(top);
                if (timeDistance > leniencyTime) {
                    // Outside of stack time range
                    return false;
                }

                var bottomStartPosition = this.getObjectStartPosition(bottom);
                var topEndPosition = this.getObjectEndPosition(top);
                var distance = Math.pow(bottomStartPosition.x - topEndPosition.x, 2) + Math.pow(bottomStartPosition.y - topEndPosition.y, 2);
                if (distance > leniencyDistance * leniencyDistance) {
                    // Outside of stack distance range
                    return mapObject.match(top, {
                        Slider: function () {
                            // Weird special case: if the top is a slider, allow
                            // stacking if the start positions are approximately equal.
                            var topStartPosition = this.getObjectStartPosition(top);
                            var distance2 = Math.pow(bottomStartPosition.x - topStartPosition.x, 2) + Math.pow(bottomStartPosition.y - topStartPosition.y, 2);

                            if (distance2 > leniencyDistance * leniencyDistance) {
                                // Outside of stack distance range
                                return false;
                            } else {
                                // Special case
                                return true;
                            }
                        },
                        _: false
                    }, this);
                }

                return true;
            }

            var i = objects.length - 1;
            while (i > 0) {
                var object = objects[i];

                var stackSize = 1;

                while (i --> 0) {
                    // Here, we are checking if testObject stacks on top of object
                    var testObject = objects[i];

                    if (!canStack.call(this, testObject, object)) {
                        break;
                    }

                    // Stack testObject on top of object
                    testObject.stackHeight = stackSize;

                    // Treat testObject as the object to stack onto next
                    object = testObject;

                    ++stackSize;
                }
            }

            // How much to move objects when stacking
            var stackOffset = this.getCircleSize() / 20;

            objects.forEach(function (object) {
                if (!object.stackHeight) return;

                mapObject.match(object, {
                    HitCircle: function (object) {
                        var o = -stackOffset * object.stackHeight;
                        object.x += o;
                        object.y += o;
                    },
                    Slider: function (object) {
                        var o = -stackOffset * object.stackHeight;
                        object.x += o;
                        object.y += o;

                        object.curve.offset = [ o, o ];
                    }
                });
            });
        },

        getMapSkipToTime: function (map) {
            var startTime = this.getMapStartTime(map);

            // TODO Configurable measure length
            var measureLength = 4;
            var bpm = this.getEffectiveBPM(startTime);

            // Start one measure early
            return startTime - measureLength * 60 * 1000 / bpm;
        },

        getMapLatestSkipTime: function (map) {
            var startTime = this.getMapStartTime(map);

            // TODO Configurable measure length
            var measureLength = 4;
            var bpm = this.getEffectiveBPM(startTime);

            // One and a half measures early
            return startTime - 1.5 * measureLength * 60 * 1000 / bpm;
        },

        getMapStartTime: function (map) {
            return this.getObjectStartAppearTime(map.objects[0]);
        },

        getMapEndTime: function (map) {
            return this.getObjectStartDisappearTime(map.objects[map.objects.length - 1]);
        },

        getMapExitTime: function (map) {
            return this.getMapEndTime(map) + 2000;
        },

        getMapProgress: function (map, time) {
            var startTime = this.getMapStartTime(map);
            var endTime = this.getMapEndTime(map);

            if (time < startTime) {
                return -(time / startTime);
            } else {
                return (time - startTime) / (endTime - startTime);
            }
        },

        getBreakinessAt: function (time) {
            var d = this.breakinessTransitionDuration;

            var breaks = this.breakTimeline.getAllAtTime(time);

            if (breaks.length) {
                return breaks.reduce(function (acc, breakRange) {
                    return Math.min(
                        acc,
                        Math.abs(time - breakRange.startTime),
                        Math.abs(time - breakRange.endTime)
                    );
                }, d) / d;
            } else {
                return 0;
            }
        }
    };

    return RuleSet;
});
