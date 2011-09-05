define('game/mapObject', [ 'util/util' ], function (util) {
    function proto(obj) {
        // Fake Object.create + extend
        // Object.create (or similar techniques) isn't used because it's slow.
        var neoObj = util.clone(obj);

        // Clone won't copy stuff on the prototype, so we do it ourselves.
        neoObj.type = obj.type;

        // Keep the original available
        neoObj.orig = obj;

        return neoObj;
    }

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

    function match(object, callbacks, context) {
        var type = object ? object.type : '_';

        if (!hasOwnProperty.call(callbacks, type)) {
            type = '_';
        }

        var value = callbacks[type];

        if (typeof value === 'function') {
            value = value.call(context, object);
        }

        return value;
    }

    function matcher(callbacks) {
        return function (object) {
            return match(object, callbacks, this);
        };
    }

    return util.extend({ }, classes, {
        match: match,
        matcher: matcher,
        proto: proto
    });
});
