define('RuleSet', [ 'Util/util', 'Slider' ], function (util, Slider) {
    var RuleSet = function () {
        this.approachRate = 5;
        this.overallDifficulty = 5;
        this.hpDrain = 5;
        this.circleSize = 5;
    };

    RuleSet.fromSettings = function (settings) {
        var ruleSet = new RuleSet();

        var fields = (
            'approachRate,overallDifficulty,hpDrain,circleSize,sliderMultiplier'
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
            // Allow players to hit a late 50
            return this.getObjectEndTime(object) + this.getHitWindow(50);
        },

        getObjectStartTime: function (object) {
            return object.time;
        },

        getObjectEndTime: function (object) {
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
            return object.time + this.getHitWindow(50);
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

        getEffectiveBPM: function (time) {
            // TODO
            return 140;
        }
    };

    return RuleSet;
});
