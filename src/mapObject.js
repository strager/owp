define('mapObject', [ ], function () {
    function HitCircle(time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
    }

    function Slider(time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
        this.curve = null;
    }

    function SliderTick(time, x, y, slider, repeatNumber) {
        this.time = time;
        this.x = x;
        this.y = y;
        this.slider = slider;
        this.repeat = repeatNumber;

        this.hitSounds = [ 'slidertick' ];
    }

    function SliderEnd(time, slider, repeatIndex, isFinal) {
        this.time = time;
        this.slider = slider;
        this.repeatIndex = repeatIndex;
        this.isFinal = isFinal;

        var position = repeatIndex % 2
            ? slider.curve.points.slice(-1)[0]
            : slider.curve.points[0];

        this.x = position[0];
        this.y = position[1];

        // TODO Newer .osu versions can customize slider end hitsounds
        this.hitSounds = [ 'hitnormal' ];
    }

    function HitMarker(object, time, score) {
        this.hitObject = object; // TODO Rename to object
        this.time = time;
        this.score = score;
    }

    var classes = {
        HitCircle: HitCircle,
        Slider: Slider,
        HitMarker: HitMarker,
        SliderTick: SliderTick,
        SliderEnd: SliderEnd,
        match: function (object, callbacks, context) {
            function call(value) {
                if (typeof value === 'function') {
                    return value.call(context, object);
                }

                return value;
            }

            var keys = 'HitCircle,Slider,HitMarker,SliderTick,SliderEnd'.split(',');
            var i, className;

            for (i = 0; i < keys.length; ++i) {
                className = keys[i];

                if (callbacks[className] && object instanceof classes[className]) {
                    return call(callbacks[className]);
                }
            }

            return call(callbacks._);
        },
        matcher: function (callbacks) {
            return function (object) {
                return classes.match(object, callbacks, this);
            };
        }
    };

    return classes;
});
