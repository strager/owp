define('HitMarker', [ ], function () {
    var HitMarker = function (hitObject, hitTime, score) {
        this.hitObject = hitObject;
        this.time = hitTime;
        this.score = score;
    };

    HitMarker.create = function (hitObject, hitTime, ruleSet) {
        var hitMarker = new HitMarker(hitObject, hitTime, 0);
        hitMarker.score = ruleSet.getHitScore(hitMarker);

        return hitMarker;
    };

    return HitMarker;
});
