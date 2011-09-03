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

    function factorial(n) {
        if (n < 0 || n >= factorialTable.length) {
            throw new Error('n out of range');
        }

        return factorialTable[n];
    }

    function choose(n, r) {
        // Standard nCr math function
        return factorial(n) / (factorial(r) * factorial(n - r));
    }

    function bernstein(n, v, x) {
        // Formula is: nCv * x^v * (1-x)^(n-v)
        // See: http://en.wikipedia.org/wiki/Bernstein_polynomial
        return choose(n, v) * Math.pow(x, v) * Math.pow((1 - x), (n - v));
    }

    function approxEqual(a, b) {
        return Math.abs(a - b) < 0.001;
    }

    function uniquePoints(xs) {
        var nxs = [ xs[0] ];
        var i;
        for (i = 1; i < xs.length; ++i) {
            if (!approxEqual(xs[i - 1][0], xs[i][0]) || !approxEqual(xs[i - 1][1], xs[i][1])) {
                nxs.push(xs[i]);
            }
        }
        return nxs;
    }

    var TOLERANCE = 1.0;

    function getBezierPointAt(t, bezier) {
        var pointCountMinusOne = bezier.length - 1;

        function processPoint(acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, t);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        }

        if (bezier.length === 3) {
            // Special case for speed
            var b0 = bernstein(pointCountMinusOne, 0, t);
            var b1 = bernstein(pointCountMinusOne, 1, t);
            var b2 = bernstein(pointCountMinusOne, 2, t);

            return [
                b0 * bezier[0][0] + b1 * bezier[1][0] + b2 * bezier[2][0],
                b0 * bezier[0][1] + b1 * bezier[1][1] + b2 * bezier[2][1]
            ];
        }

        return bezier.reduce(processPoint, [ 0, 0 ]);
    }

    function flattenBezierNaive(bezier, step) {
        var segs = [ ];

        var t;
        for (t = 0; t < 1; t += step) {
            segs.push(getBezierPointAt(t, bezier));
        }

        segs.push(getBezierPointAt(1, bezier));

        return uniquePoints(segs);
    }

    function BezierSliderCurve(rawPoints, sliderLength) {
        this.length = sliderLength;

        // Split rawPoints into a set of curves by `linear` points
        /*
        var sets = [ ];
        var currentSet = [ ];
        var lastPoint = null, thisPoint;
        var i;

        for (i = 0; i < rawPoints.length; ++i) {
            thisPoint = rawPoints[i];

            if (lastPoint && lastPoint[0] === thisPoint[0] && lastPoint[1] === thisPoint[1]) {
                sets.push(currentSet);
                currentSet = [ thisPoint ];
            }
        }
        */

        this.flattenCentrePoints = function () {
            return flattenBezierNaive(rawPoints, 0.1);
        };

        this.getStartPoint = function () {
            return rawPoints[0];
        };

        this.getEndPoint = function () {
            // TODO XXX
            return rawPoints[rawPoints.length - 1];
        };

        //this.points = render(rawPoints, rawPoints.length, this.length);
    }

    function getSliderBallPercentage(repeatLength, timeOffset) {
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
    }

    function getLengthIndex(points, length) {
        // TODO Reverse cache map by length?

        var i;

        for (i = 1; i < points.length; ++i) {
            if (points[i][2] > length) {
                return i - 1;
            }
        }

        return -1;
    }

    /*
    var tolerance = 0.1;

    BezierSliderCurve.prototype.getTickPositions = function (tickLength) {
        var ticks = [ ];
        var i, pointIndex;

        for (i = 1; i < Math.floor(tolerance + this.length / tickLength); ++i) {
            // TODO smarter calculation
            pointIndex = getLengthIndex(this.points, tickLength * i);
            ticks.push(this.points[pointIndex]);
        }

        return ticks;
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
    */

    return BezierSliderCurve;
});
