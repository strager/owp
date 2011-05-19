define('RuleSet', [ 'Util/util' ], function (util) {
    var RuleSet = function () {
        this.approachRate = 5;
        this.overallDifficulty = 5;
        this.hpDrain = 5;
        this.circleSize = 5;
    };

    RuleSet.fromSettings = function (settings) {
        var ruleSet = new RuleSet();

        var fields = (
            'approachRate,overallDifficulty,hpDrain,circleSize'
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
            return this.getObjectStartTime(object) + (object.duration || 0);
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

            var opaqueTime = (appearTime + startTime) * 0.5;

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
            if (arguments.length === 0) {
                // score not provided;
                // assume widest hit window
                score = 0;
            }

            var windows = {
                300: [  80,  50,  20 ],
                100: [ 140, 100,  60 ],
                50:  [ 200, 150, 100 ],
                0:   [ 260, 200, 140 ]  // FIXME Just a guess
            };

            var window = windows[score];

            if (!window) {
                throw new Error('score must be one of: ' + Object.keys(windows).join(', '));
            }

            return this.threePartLerp(window[0], window[1], window[2], this.overallDifficulty);
        },

        getHitScore: function (object, hit) {
            var delta = Math.abs(this.getObjectEndTime(object) - hit.time);

            var scores = [ 300, 100, 50, 0 ];
            var i;

            for (i = 0; i < scores.length; ++i) {
                if (delta <= this.getHitWindow(scores[i])) {
                    return scores[i];
                }
            }

            return 0;   // TODO Return "shouldn't be hit" or throw or something
        }
    };

    return RuleSet;
});
