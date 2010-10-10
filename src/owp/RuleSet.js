exports.$ = (function () {
    var util = require('owp/Util/util');

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
        getAppearTime: function () {
            // 0 => 1800ms
            // 5 => 1200ms
            // 10 => 450ms

            if (this.approachRate < 5) {
                return 1800 + (this.approachRate - 0) * (1200 - 1800) / (5 - 0);
            } else {
                return 1200 + (this.approachRate - 5) * (450 - 1200) / (10 - 5);
            }
        },

        getObjectAppearTime: function (object) {
            return this.getObjectStartTime(object) - this.getAppearTime();
        },

        getObjectDisappearTime: function (object) {
            return this.getObjectEndTime(object) + 50;  // TODO
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

            return distance < 64;
        },

        getHitScore: function (object, hit) {
            var delta = Math.abs(this.getObjectEndTime(object) - hit.time);

            if (delta < 100) {
                return 300;
            } else if (delta < 300) {
                return 100;
            } else if (delta < 600) {
                return 50;
            } else {
                return 0;
            }
        }
    };

    return RuleSet;
}());
