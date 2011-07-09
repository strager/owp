define('RuleSet', [ 'Util/util', 'HitCircle', 'HitMarker', 'Slider', 'SliderTick' ], function (util, HitCircle, HitMarker, Slider, SliderTick) {
    var RuleSet = function () {
        this.approachRate = 5;
        this.overallDifficulty = 5;
        this.hpDrain = 5;
        this.circleSize = 5;
    };

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

        getObjectStartTime: function (object) {
            if (object instanceof SliderTick) {
                return this.getObjectStartTime(object.slider);
            }

            return object.time;
        },

        getObjectEndTime: function (object) {
            if (object instanceof SliderTick) {
                return object.time;
            }

            var duration = 0;

            if (object instanceof Slider) {
                duration = object.repeats * this.getSliderRepeatLength(object.time, object.length);
            }

            return this.getObjectStartTime(object) + duration;
        },

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

        getObjectLatestHitTime: function (object) {
            var offset = 0;

            if (object instanceof HitCircle) {
                offset = this.getHitWindow(50);
            }

            return this.getObjectEndTime(object) + offset;
        },

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
            return this.getHitMarkerScoreImageName(hitMarker.score);
        },

        getHitMarkerScoreImageName: function (score) {
            var imageNames = {
                300: 'hit300',
                100: 'hit100',
                50: 'hit50',
                30: 'sliderpoint30',
                10: 'sliderpoint10',
                0: 'hit0'
            };

            if (!imageNames.hasOwnProperty(score)) {
                throw new Error('Invalid hit score ' + score);
            }

            return imageNames[score];
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

        getHitScore: function (hitMarker) {
            var delta = Math.abs(this.getObjectEndTime(hitMarker.hitObject) - hitMarker.time);

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
            var sliderTicks = [ ];

            objects.forEach(function (object) {
                if (object instanceof HitMarker) {
                    hitMarkers.push(object);
                } else if (object instanceof SliderTick) {
                    sliderTicks.push(object);
                } else {
                    hitObjects.push(object);
                }
            });

            var sorted = hitObjects.sort(function (a, b) {
                // Sort by time descending
                return a.time > b.time ? -1 : 1;
            });

            // Put slider ticks after their sliders
            sliderTicks.forEach(function (tick) {
                var index = sorted.indexOf(tick.slider);

                if (index < 0) {
                    throw new Error('Inconsistent map state');
                }

                sorted.splice(index + 1, 0, tick);
            });

            // Put hit markers before their hit objects
            hitMarkers.forEach(function (hitMarker) {
                var index = sorted.indexOf(hitMarker.hitObject);

                if (index < 0) {
                    sorted.push(hitMarker);
                } else {
                    sorted.splice(index, 0, hitMarker);
                }
            });

            return sorted;
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

            var tickLength = this.getTickLength(startTime);
            var tickDuration = this.getTickDuration(startTime);

            var tickPositions = slider.curve.getTickPositions(tickLength);

            var ticks = [ ];
            var repeatDuration = this.getSliderRepeatLength(slider.time, slider.length);

            for (var repeatIndex = 0; repeatIndex < slider.repeats; ++repeatIndex) {
                ticks = ticks.concat(tickPositions.map(function (tickPosition, tickIndex) {
                    return new SliderTick(
                        startTime + (tickIndex + 1) * tickDuration + repeatIndex * repeatDuration,
                        tickPosition[0],
                        tickPosition[1],
                        slider,
                        0
                    );
                }));

                tickPositions = tickPositions.reverse();
            }

            return ticks;
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
            // TODO
            return 140;
        }
    };

    return RuleSet;
});
