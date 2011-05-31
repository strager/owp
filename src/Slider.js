define('Slider', [ 'HitObject' ], function (HitObject) {
    var Slider = function (time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
    };

    Slider.prototype = new HitObject();

    Slider.prototype.renderPoints = function () {
        throw new TypeError('renderPoints must be replaced per-instance');
    };

    Slider.bezier = function (points) {
        return points;
    };

    return Slider;
});
