define('Slider', [ 'HitObject' ], function (HitObject) {
    var Slider = function (time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
    };

    Slider.prototype = new HitObject();

    return Slider;
});
