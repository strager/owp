exports.$ = (function () {
    var RuleSet = function () {
        this.appearTime = 500;
        this.disappearTime = 50;
    };

    RuleSet.prototype = {
        getObjectAppearTime: function (object) {
            return object.time - this.appearTime;
        },

        getObjectDisappearTime: function (object) {
            return object.time + this.disappearTime;
        },

        // Returns 'before', 'during', or 'after'
        getObjectStateAtTime: function (object, time) {
            var appearTime = this.getObjectAppearTime(object);

            if (appearTime > time) {
                return 'before';
            }

            var disappearTime = this.getObjectDisappearTime(object);

            if (disappearTime < time) {
                return 'after';
            }

            return 'during';
        }
    };

    return RuleSet;
}());
