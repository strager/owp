define('BezierSliderCurve', [ ], function () {
    var BezierSliderCurve = function (points, length, repeats) {
        this.points = points.slice();
        this.length = length;
        this.repeats = repeats;
    };

    var factorialTable = (function () {
        // Precalculate factorials into a look-up table
        var lutSize = 16;

        // TODO See how much performance we gain using typed arrays
        var ret = [ ];
        var acc = 1;
        var i;

        for (i = 0; i <= lutSize; ++i) {
            ret.push(acc);
            acc *= (i + 1);
        }

        return ret;
    }());

    var factorial = function (n) {
        if (n < 0 || n >= factorialTable.length) {
            throw new Error('n out of range');
        }

        return factorialTable[n];
    };

    var choose = function (n, r) {
        // Standard nCr math function
        return factorial(n) / (factorial(r) * factorial(n - r));
    };

    var bernstein = function (n, v, x) {
        // Formula is: nCv * x^v * (1-x)^(n-v)
        // See: http://en.wikipedia.org/wiki/Bernstein_polynomial
        return choose(n, v) * Math.pow(x, v) * Math.pow((1 - x), (n - v));
    };

    var pointProcessor = function (targetObject, pointCount) {
        var pointCountMinusOne = pointCount - 1;

        return function (acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, targetObject.target);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        };
    };

    BezierSliderCurve.prototype.getSliderBallPercentage = function (time, timeOffset, ruleSet) {
        var repeatLength = ruleSet.getSliderRepeatLength(time, this.length);

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

        return target;
    };

    BezierSliderCurve.prototype.getSliderBallPosition = function (time, timeOffset, ruleSet) {
        var target = this.getSliderBallPercentage(time, timeOffset, ruleSet);

        var processPoint = pointProcessor({ target: target }, this.points.length);

        return this.points.reduce(processPoint, [ 0, 0 ]);
    };

    BezierSliderCurve.prototype.render = function (stepCount, maxSize) {
        // Estimates a bezier curve
        // TODO Linear control points (osu!-specific)

        var points = this.points;

        if (!stepCount && stepCount !== 0) {
            // No step count given; create our own
            stepCount = (points.length - 1) * 50;
        }

        if (stepCount <= 0) {
            return [ ];
        }

        if (isNaN(maxSize)) {
            maxSize = 1;
        }

        var out = [ ];

        var step, curPoint;
        var t = { };

        var processPoint = pointProcessor(t, points.length);

        for (step = 0; step <= stepCount; ++step) {
            t.target = step / stepCount; // Affects processPoint

            if (t.target >= maxSize) {
                break;
            }

            curPoint = points.reduce(processPoint, [ 0, 0 ]);

            // WTB generators/coroutines/yield/whatever...
            out.push(curPoint);
        }

        return out;
    };

    return BezierSliderCurve;
});
