exports.$ = (function () {
    var HitObject = require('HitCircle').$;

    var HitCircle = function () {
    };

    HitCircle.prototype = new HitObject();

    return HitCircle;
}());
