exports.$ = (function () {
    var RuleSet = function () {
        this.appearTime = 1500;
        this.disappearTime = 200;
    };

    RuleSet.fromSettings = function (settings) {
        var ruleSet = new RuleSet();

        // TODO

        return ruleSet;
    };

    RuleSet.prototype = {
        getObjectAppearTime: function (object) {
            return this.getObjectStartTime(object) - this.appearTime;
        },

        getObjectDisappearTime: function (object) {
            return this.getObjectEndTime(object) + this.disappearTime;
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

            return distance < 20;
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
