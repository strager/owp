define('BezierSliderCurve', [ ], function () {
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

    var render = function (rawPoints, stepCount, maxLength) {
        // Estimates a bezier curve
        // TODO Linear control points (osu!-specific)

        var out = [ ];

        var step, curPoint;
        var t = 0;

        var pointCountMinusOne = rawPoints.length - 1;

        var processPoint = function (acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, t);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        };

        var lastPoint = null;

        var currentLength = 0;

        for (step = 0; step <= stepCount; ++step) { 
            t = step / stepCount; // Affects processPoint

            curPoint = rawPoints.reduce(processPoint, [ 0, 0 ]);

            if (lastPoint) {
                var deltaX = curPoint[0] - lastPoint[0];
                var deltaY = curPoint[1] - lastPoint[1];

                currentLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            }

            curPoint[2] = currentLength;

            // WTB generators/coroutines/yield/whatever...
            if (currentLength >= maxLength) {
                break;
            }

            out.push(curPoint);

            lastPoint = curPoint;
        }

        return out;
    };

    var BezierSliderCurve = function (rawPoints, sliderLength, repeatCount) {
        this.length = sliderLength;
        this.points = render(rawPoints, (rawPoints.length - 1) * 50, this.length);
    };

    var getSliderBallPercentage = function (repeatLength, timeOffset) {
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

    var getLengthIndex = function (points, length) {
        // TODO Reverse cache map by length?

        var i;

        for (i = 1; i < points.length; ++i) {
            if (points[i][2] > length) {
                return i - 1;
            }
        }

        return -1;
    };

    BezierSliderCurve.prototype.getSliderBallPosition = function (object, time, ruleSet) {
        var repeatLength = ruleSet.getSliderRepeatLength(time, object.length);

        var startTime = ruleSet.getObjectStartTime(object);
        var timeOffset = time - startTime;

        var targetLength = getSliderBallPercentage(repeatLength, timeOffset) * this.length;

        var index = getLengthIndex(this.points, targetLength);

        if (index >= 0) {
            return this.points[index];
        } else {
            return null;
        }
    };

    BezierSliderCurve.prototype.render = function (percentage) {
        var index = getLengthIndex(this.points, this.length * percentage);

        if (index >= 0) {
            return this.points.slice(0, index);
        } else {
            return this.points.slice();
        }
    };

    return BezierSliderCurve;
});
