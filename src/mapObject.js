define('mapObject', [ 'Util/util' ], function (util) {
    function proto(obj) {
        // Fake Object.create + extend
        // Object.create (or similar techniques) isn't used because it's slow.
        // Clone won't copy stuff on the prototype, so we do it ourselves.
        var neoObj = { };
        util.extend(neoObj, obj.constructor.prototype);
        util.extend(neoObj, obj);

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
    Slider.prototype.getSliderBallPosition = function (time, ruleSet) {
        // TODO Move to RuleSet

        var repeatLength = ruleSet.getSliderRepeatLength(time, this.curve.length);
        var timeOffset = time - this.time;

        var rawTarget = timeOffset / repeatLength;

        // Perform repeat:
        // if rawTarget is oddish (e.g. [1,2) [3,4)), it's a reverse repeat
        // and should be backwards (from 1 to 0) else, it's a forward repeat
        // and should be forwards (from 0 to 1)
        var isBackwards = Math.floor(rawTarget) % 2 === 1;
        var target = rawTarget % 1;
        if (isBackwards) {
            target = 1 - target;
        }

        var targetLength = target * this.length;
        return this.curve.getPointAtLength(targetLength);
    };

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
            ? slider.curve.getEndPoint()
            : slider.curve.getStartPoint();

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
