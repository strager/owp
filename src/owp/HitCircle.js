exports.$ = (function () {
    var HitObject = require('owp/HitObject').$;

    var HitCircle = function (time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
    };

    HitCircle.prototype = new HitObject();

    return HitCircle;
}());
