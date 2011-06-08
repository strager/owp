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

    Slider.prototype.getSliderBallPosition = function (time, ruleSet) {
        var points = this.points; // HACK FIXME

        var startTime = ruleSet.getObjectStartTime(this);
        var endTime = ruleSet.getObjectEndTime(this);

        if (!(startTime < time && time < endTime)) {
            return null;
        }

        var timeOffset = time - startTime;
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

        var pointCountMinusOne = points.length - 1;

        var processPoint = function (acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, target);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        };

        return points.reduce(processPoint, [ 0, 0 ]);
    };

    var factorialTable = (function () {
        // Precalculate factorials into a look-up table
        var lutSize = 16;

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

    Slider.bezier = function (points, stepCount, maxLength) {
        this.points = points; // HACK FIXME

        // Estimates a bezier curve
        // TODO Linear control points (osu!-specific)

        var out = [ ];

        var step, t, curPoint;
        var lastPoint = null;

        var pointCountMinusOne = points.length - 1;

        var currentLengthSquared = 0;
        var maxLengthSquared = maxLength * maxLength;

        var processPoint = function (acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, t);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        };

        for (step = 0; step <= stepCount; ++step) { 
            t = step / stepCount; // Affects processPoint

            curPoint = points.reduce(processPoint, [ 0, 0 ]);

            if (lastPoint) {
                // Stop giving points before the max length is reached
                var x2 = curPoint[0] - lastPoint[0];
                var y2 = curPoint[1] - lastPoint[1];

                currentLengthSquared += x2 * x2 + y2 * y2;

                if (currentLengthSquared > maxLengthSquared) {
                    break;
                }
            }

            // WTB generators/coroutines/yield/whatever...
            out.push(curPoint);

            lastPoint = curPoint;
        }

        return out;
    };

    return Slider;
});
