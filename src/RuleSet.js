define('RuleSet', [ 'Util/util', 'mapObject', 'Util/History' ], function (util, mapObject, History) {
    function RuleSet() {
        this.approachRate = 5;
        this.overallDifficulty = 5;
        this.hpDrain = 5;
        this.circleSize = 5;
        this.uninheritedTimingPointHistory = new History();
        this.inheritedTimingPointHistory = new History();
    }

    RuleSet.fromSettings = function (settings) {
        var ruleSet = new RuleSet();

        var fields = (
            'approachRate,overallDifficulty,hpDrain,circleSize,sliderMultiplier,sliderTickRate'
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

        return ruleSet;
    };

    RuleSet.prototype = {
        threePartLerp: function (a, b, c, value) {
            value = +value; // Quick cast to number

            if (value < 5) {
                return a + (value - 0) * (b - a) / (5 - 0);
            } else {
                return b + (value - 5) * (c - b) / (10 - 5);
            }
        },

        getAppearTime: function () {
            return this.threePartLerp(1800, 1200, 450, this.approachRate);
        },

        getObjectAppearTime: function (object) {
            return this.getObjectStartTime(object) - this.getAppearTime();
        },

        getObjectDisappearTime: function (object) {
            return this.getObjectLatestHitTime(object);
        },

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
            var appearTime    = this.getObjectAppearTime(object);
            var startTime     = this.getObjectStartTime(object);
            var endTime       = this.getObjectEndTime(object);
            var disappearTime = this.getObjectDisappearTime(object);

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

        getObjectOpacity: function (object, time) {
            var appearTime    = this.getObjectAppearTime(object);
            var startTime     = this.getObjectStartTime(object);
            var disappearTime = this.getObjectDisappearTime(object);

            var opaqueTime = (appearTime * 2 + startTime * 1) / 3;

            if (time < appearTime) {
                return 0;
            } else if (time < opaqueTime) {
                return (time - appearTime) / (opaqueTime - appearTime);
            } else if (time < disappearTime) {
                return 1;
            } else {
                return 0;
            }
        },

        getSliderGrowPercentage: function (object, time) {
            // TODO Real calculations
            var x = this.getObjectOpacity(object, time);

            return Math.sqrt(x);
        },

        getObjectApproachProgress: function (object, time) {
            var appearTime    = this.getObjectAppearTime(object);
            var startTime     = this.getObjectStartTime(object);
            var endTime       = this.getObjectEndTime(object);
            var disappearTime = this.getObjectDisappearTime(object);

            if (time < appearTime) {
                return 0;
            } else if (time < startTime) {
                return (time - appearTime) / (startTime - appearTime);
            } else if (time < endTime) {
                return 1;
            } else if (time <= disappearTime) {
                return ((time - endTime) / (disappearTime - endTime)) - 1;
            } else {
                return 0;
            }
        },

        getObjectEarliestHitTime: function (object) {
            return object.time - this.getHitWindow(0);
        },

        getObjectLatestHitTime: mapObject.matcher({
            HitCircle: function (object) {
                return this.getObjectEndTime(object) + this.getHitWindow(50);
            },
            _: function (object) {
                return this.getObjectEndTime(object);
            }
        }),

        canHitObject: function (object, x, y, time) {
            var distance = Math.sqrt(Math.pow(object.x - x, 2) + Math.pow(object.y - y, 2));

            // TODO Better logic

            return distance <= this.getCircleSize() / 2;
        },

        // Gives diameter
        getCircleSize: function () {
            return -(this.circleSize - 5) * 16 + 64;
        },

        getHitMarkerImageName: function (hitMarker) {
            // Should this be here?

            var imageNames = {
                300: 'hit300',
                100: 'hit100',
                50: 'hit50',
                30: 'sliderpoint30',
                10: 'sliderpoint10',
                0: 'hit0'
            };

            if (hitMarker.hitObject instanceof mapObject.SliderTick && hitMarker.score === 0) {
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

            return this.threePartLerp(window[0], window[1], window[2], this.overallDifficulty);
        },

        getHitScore: function (object, time) {
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

        getHitMarkerScale: function (hitMarker, time) {
            // TODO
            return 0.5;
        },

        getHitSoundNames: function (hitMarker) {
            // osu!'s hitsound sections are based on the hitsound time; we
            // choose to use the hit object's time, as that makes more sense
            // and is probably what the mapper intended.
            var time = hitMarker.hitObject.time;

            // TODO Base prefix and suffix on time (normal, soft, custom, etc.)
            var prefix = 'normal-';
            var suffix = '.wav';

            // TODO Slider and spinner sounds

            if (!hitMarker.hitObject.hitSounds) {
                // TODO This should never happen (I think)
                return [ ];
            }

            return hitMarker.hitObject.hitSounds.map(function (hitSound) {
                return prefix + hitSound + suffix;
            });
        },

        getTotalAccuracy: function (hitMarkers) {
            var maxScoreValue = 0;
            var currentScoreValue = 0;

            hitMarkers.forEach(function (hitMarker) {
                maxScoreValue += 300;
                currentScoreValue += hitMarker.score;
            });

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
                if (hitMarker.score === 0) {
                    currentCombo = 0;

                    return;
                }

                currentScore += hitMarker.score * (1 + (
                    Math.max(currentCombo - 1, 0) *
                    difficultyMultiplier *
                    modMultiplier
                ) / 25);

                ++currentCombo;
            });

            return currentScore;
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

            var rawTickPositions = slider.curve.getTickPositions(tickLength);

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

            var startPosition = slider.curve.points[0];
            var endPosition = slider.curve.points.slice(-1)[0];

            var ends = [ ];

            var i;

            for (i = 1; i <= slider.repeats; ++i) {
                ends.push(new mapObject.SliderEnd(
                    startTime + i * repeatDuration,
                    slider,
                    i,
                    i === slider.repeats
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
            var uninherited = this.uninheritedTimingPointHistory.getDataAtTime(time);

            if (!inherited && !uninherited) {
                return NaN;
            }

            if (!inherited) {
                return uninherited.getEffectiveBPM(null);
            } else {
                return inherited.getEffectiveBPM(uninherited);
            }
        }
    };

    return RuleSet;
});
