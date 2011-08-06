define('mapObject', [ ], function () {
    function HitCircle(time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
    }

    HitCircle.prototype.type = 'HitCircle';

    function Slider(time, x, y) {
        this.time = time;
        this.x = x;
        this.y = y;
        this.curve = null;
    }

    Slider.prototype.type = 'Slider';

    function SliderTick(time, x, y, slider, repeatNumber) {
        this.time = time;
        this.x = x;
        this.y = y;
        this.slider = slider;
        this.repeat = repeatNumber;

        this.hitSounds = [ 'slidertick' ];
    }

    SliderTick.prototype.type = 'SliderTick';

    function SliderEnd(time, slider, repeatIndex, isFinal, hitSounds) {
        this.time = time;
        this.slider = slider;
        this.repeatIndex = repeatIndex;
        this.isFinal = isFinal;

        var position = repeatIndex % 2
            ? slider.curve.points.slice(-1)[0]
            : slider.curve.points[0];

        this.x = position[0];
        this.y = position[1];

        this.hitSounds = hitSounds;
    }

    SliderEnd.prototype.type = 'SliderEnd';

    function HitMarker(object, time, score, isHit) {
        this.hitObject = object; // TODO Rename to object
        this.time = time;
        this.score = score;
        this.isHit = isHit;
    }

    HitMarker.prototype.type = 'HitMarker';

    var classes = {
        HitCircle: HitCircle,
        Slider: Slider,
        HitMarker: HitMarker,
        SliderTick: SliderTick,
        SliderEnd: SliderEnd
    };

    var classNames = 'HitCircle,Slider,HitMarker,SliderTick,SliderEnd'.split(',');

    var hasOwnProperty = Object.prototype.hasOwnProperty;

    function call(value, context, args) {
        if (typeof value === 'function') {
            return value.apply(context, args);
        }

        return value;
    }

    classes.match = function (object, callbacks, context, args) {
        var type = object.type;

        args = args || [ object ];

        if (hasOwnProperty.call(callbacks, type)) {
            return call(callbacks[type], context, args);
        } else {
            return call(callbacks._, context, args);
        }
    };

    var slice = Array.prototype.slice;

    classes.matcher = function (callbacks) {
        return function (object) {
            return classes.match(object, callbacks, this, arguments);
        };
    };

    return classes;
});
