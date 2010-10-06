exports.$ = (function () {
    var HitObjectHit = function (hitObject, hitTime) {
        this.hitObject = hitObject;
        this.time = hitTime;
    };

    return HitObjectHit;
}());
