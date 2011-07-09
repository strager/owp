define('SliderEnd', [ ], function () {
    var SliderEnd = function (time, slider, repeatIndex, isFinal) {
        this.time = time;
        this.slider = slider;
        this.repeatIndex = repeatIndex;
        this.isFinal = isFinal;

        var position = repeatIndex % 2
            ? slider.curve.points.slice(-1)[0]
            : slider.curve.points[0];

        this.x = position[0];
        this.y = position[1];
    };

    return SliderEnd;
});
