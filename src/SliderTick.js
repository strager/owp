define('SliderTick', [ ], function () {
    var SliderTick = function (time, x, y, slider, repeatNumber) {
        this.time = time;
        this.x = x;
        this.y = y;
        this.slider = slider;
        this.repeat = repeatNumber;
    };

    return SliderTick;
});
