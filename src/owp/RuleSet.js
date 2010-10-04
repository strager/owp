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

        /*
         * {
         *     visibility: 'before', 'appearing', 'during', 'disappearing', or 'after',
         *     progress: 0 .. 1
         * }
         */
        getObjectStateAtTime: function (object, time) {
            var appearTime    = this.getObjectAppearTime(object);
            var startTime     = this.getObjectStartTime(object);
            var endTime       = this.getObjectEndTime(object);
            var disappearTime = this.getObjectDisappearTime(object);

            var visibility, progress;

            if (time < appearTime) {
                visibility = 'before';
                progress = 0;
            } else if (time < startTime) {
                visibility = 'appearing';
                progress = (time - appearTime) / (startTime - appearTime);
            } else if (time < endTime) {
                visibility = 'during';
                progress = (time - startTime) / (endTime - startTime);
            } else if (time <= disappearTime) {
                visibility = 'disappearing';
                progress = (time - endTime) / (disappearTime - endTime);
            } else {
                visibility = 'after';
                progress = 0;
            }

            return {
                visibility: visibility,
                progress: progress
            };
        }
    };

    return RuleSet;
}());
