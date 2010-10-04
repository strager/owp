exports.$ = (function () {
    var RuleSet = function () {
        this.appearTime = 500;
        this.disappearTime = 50;
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

        // Returns 'before', 'appearing', 'during', 'disappearing', or 'after'
        getObjectStateAtTime: function (object, time) {
            var appearTime    = this.getObjectAppearTime(object);
            var startTime     = this.getObjectStartTime(object);
            var endTime       = this.getObjectEndTime(object);
            var disappearTime = this.getObjectDisappearTime(object);

            if (time < appearTime) {
                return 'before';
            }

            if (time < startTime) {
                return 'appearing';
            }

            if (time < endTime) {
                return 'during';
            }

            if (time <= disappearTime) {
                return 'disappearing';
            }

            return 'after';
        }
    };

    return RuleSet;
}());
