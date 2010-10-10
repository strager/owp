exports.$ = (function () {
    var HitMarker = function (hitObject, hitTime) {
        this.hitObject = hitObject;
        this.time = hitTime;
    };

    return HitMarker;
}());
