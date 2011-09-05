define('game/BezierSliderCurve', [ ], function () {
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

    function renderImpl(rawPoints, stepCount, startLength, maxLength) {
        // Estimates a bezier curve
        // TODO Adaptive rendering (http://antigrain.com/research/adaptive_bezier/)

        var derivativePoints = [ ];
        var i;
        for (i = 1; i < rawPoints.length; ++i) {
            derivativePoints.push([
                (rawPoints[i][0] - rawPoints[i - 1][0]) * rawPoints.length,
                (rawPoints[i][1] - rawPoints[i - 1][1]) * rawPoints.length
            ]);
        }

        var out = [ ];

        var step, curPoint;
        var t = 0;

        var pointCountMinusOne = rawPoints.length - 1;
        var pointCountMinusTwo = rawPoints.length - 2;

        function processPoint(acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, t);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        }

        function processDerivative(acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusTwo, pointIndex, t);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        }

        var lastPoint = null;

        var currentLength = startLength;

        for (step = 0; step <= stepCount; ++step) {
            t = step / stepCount; // Affects processPoint, processDerivative

            curPoint = rawPoints.reduce(processPoint, [ 0, 0 ]);

            var derivative = derivativePoints.reduce(processDerivative, [ 0, 0 ]);
            var derivativeLength = Math.sqrt(derivative[0] * derivative[0] + derivative[1] * derivative[1]);
            curPoint[3] = derivative[0] / derivativeLength;
            curPoint[4] = derivative[1] / derivativeLength;

            if (lastPoint) {
                var deltaX = curPoint[0] - lastPoint[0];
                var deltaY = curPoint[1] - lastPoint[1];

                var length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                currentLength += length;
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
    }

    function render(rawPoints, stepCount, maxLength) {
        var i, lastCurveStart = 0;
        var curves = [ ];

        for (i = 1; i < rawPoints.length; ++i) {
            var lastPoint = rawPoints[i - 1];
            var thisPoint = rawPoints[i];

            if (lastPoint[0] === thisPoint[0] && lastPoint[1] === thisPoint[1]) {
                // Double point => linear
                // We split the beziers into two curves and process them individually
                curves.push(rawPoints.slice(lastCurveStart, i));
                lastCurveStart = i;
            }
        }

        if (i !== lastCurveStart) {
            curves.push(rawPoints.slice(lastCurveStart));
        }

        var renderedPoints = [ ];
        var currentLength = 0;

        curves.forEach(function (curvePoints) {
            if (currentLength >= maxLength) {
                return;
            }

            var ps = renderImpl(curvePoints, (curvePoints.length - 1) * 50, currentLength, maxLength);

            // Fill out a nice round corner with nice hacky code.
            // This totally doesn't work, but no one needs to know that yet.
            if (renderedPoints.length && ps.length) {
                var left = renderedPoints[renderedPoints.length - 1];
                var right = ps[0];

                var p = [
                    (left[0] + right[0]) / 2,
                    (left[1] + right[1]) / 2,
                    (left[2] + right[2]) / 2,
                    0,
                    0
                ];

                var leftAngle = Math.atan2(left[4], left[3]);
                var rightAngle = Math.atan2(right[4], right[3]);

                var j, m = 100;

                for (j = 0; j < m; ++j) {
                    var angle = (leftAngle * (j / m)) + (rightAngle * (1 - j / m));
                    p[3] = Math.cos(angle);
                    p[4] = Math.sin(angle);
                    renderedPoints.push(p.slice());
                }
            }

            renderedPoints.push.apply(renderedPoints, ps);

            var last = ps[ps.length - 1];

            if (last) {
                currentLength = last[2];
            }
        });

        return renderedPoints;
    }

    function BezierSliderCurve(rawPoints, sliderLength) {
        this.length = sliderLength;
        this.points = render(rawPoints, rawPoints.length, this.length);
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

    return BezierSliderCurve;
});
