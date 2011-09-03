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

    function xs(bezier) {
        return bezier.map(function (point) {
            return point[0];
        });
    }

    function ys(bezier) {
        return bezier.map(function (point) {
            return point[1];
        });
    }

    function reverseBezier(bezier) {
        return bezier.slice().reverse();
    }

    function reverseBeziers(beziers) {
        return beziers.map(reverseBezier).reverse();
    }

    function translatedBezierBy(x, y, bezier) {
        return bezier.map(function (point) {
            return [
                point[0] + x,
                point[1] + y
            ];
        });
    }

    function translatedBeziersBy(x, y, beziers) {
        return beziers.map(function (bezier) {
            return translatedBezierBy(x, y, bezier);
        });
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

    function splitBezierAt(t, bezier) {
        var left = [ ];
        var right = [ ];
        var i, j;
        var neoBezier;

        i = 0;

        while (bezier.length > 1) {
            neoBezier = [ ];

            left.push(bezier[0]);
            right.unshift(bezier[bezier.length - 1]);
            ++i;

            for (j = 1; j < bezier.length; ++j) {
                neoBezier.push([
                    bezier[j - 1][0] * (1 - t) + bezier[j][0] * t,
                    bezier[j - 1][1] * (1 - t) + bezier[j][1] * t
                ]);
            }

            bezier = neoBezier;
        }

        left.push(neoBezier[0]);
        right.unshift(neoBezier[0]);

        return [ left, right ];
    }

    function splitBezierAtMany(ts, bezier) {
        ts = ts.sort();

        // Rewrite ts.  If we have two t's, 0.33 and 0.66:
        // |----+----+----|
        // after the first split, the second t is 0.5:
        // |----|----+----|
        //
        // Another example:
        // |-----+--+--| .50/.75
        // |-----|--+--| .50/.50
        // ^________^__^ .75/.25
        //       ^__^__^ .25/.50
        var i = ts.length;
        while (i --> 1) {
            var a = ts[i - 1];
            var b = 1;
            var x = ts[i];
            ts[i] = (x - a) / (b - a);
        }

        var splitBeziers = [ bezier ];

        while (ts.length > 0) {
            var t = ts.shift()
            var orig = splitBeziers.pop();
            var split = splitBezierAt(t, orig);
            splitBeziers.push(split[0]);
            splitBeziers.push(split[1]);
        }

        return splitBeziers;
    }

    function bezierDerivative(bezier) {
        var pointCount = bezier.length;
        var derivativeBezier = [ ];
        var i;

        for (i = 1; i < pointCount; ++i) {
            derivativeBezier.push([
                (bezier[i][0] - bezier[i - 1][0]) * pointCount,
                (bezier[i][1] - bezier[i - 1][1]) * pointCount
            ]);
        }

        return derivativeBezier;
    }

    function getBezierDerivativeAt(t, bezier) {
        var d = getBezierPointAt(t, bezierDerivative(bezier));
        var length = Math.sqrt(d[0] * d[0] + d[1] * d[1]);
        return [ d[0] / length, d[1] / length ];
    }

    function circleToBeziers(radius, fromAngle, toAngle) {
        var k = (4 * (Math.sqrt(2) - 1) / 3) * radius;

        function quad(dx, dy) {
            return [
                [ dx * radius, 0           ],
                [ dx * radius, dy * k      ],
                [ dx * k,      dy * radius ],
                [ 0,           dy * radius ]
            ];
        }

        // It's more optimal to draw the circle from angle 0 then rotate the
        // resulting curves, so that's what we do.
        while (fromAngle > toAngle) {
            fromAngle -= Math.PI * 2;
        }

        var angle = toAngle - fromAngle;

        // Normalize angle to [0,4] range ([0,1] for each quadrant)
        angle = 4 * angle / (Math.PI * 2);

        // Now build the t's (TODO should be % length) for each quadrant curve
        function clamp(min, v, max) {
            return Math.max(Math.min(v, max), min);
        }

        var q1ta = 0;
        var q1tb = clamp(0, angle, 1) - 0;

        var q2ta = 0;
        var q2tb = clamp(1, angle, 2) - 1;

        var q3ta = 0;
        var q3tb = clamp(2, angle, 3) - 2;

        var q4ta = 0;
        var q4tb = clamp(3, angle, 4) - 3;

        var beziers = [ ];

        function addQuad(ta, tb, q) {
            if (ta !== tb) {
                beziers.push(splitBezierAtMany([ ta, tb ], q)[1]);
            }
        }

        addQuad(q1ta, q1tb, quad( 1, -1));
        addQuad(q2ta, q2tb, quad(-1, -1).reverse());
        addQuad(q3ta, q3tb, quad(-1,  1));
        addQuad(q4ta, q4tb, quad( 1,  1).reverse());

        var sin = Math.sin(-fromAngle);
        var cos = Math.cos(-fromAngle);

        return beziers.map(function (bezier) {
            return bezier.map(function (point) {
                var x = point[0];
                var y = point[1];

                return [
                    x * cos - y * sin,
                    x * sin + y * cos
                ];
            });
        });
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

    function bezierComponentExtremes3(a, b, c) {
        if (a - b * 2 + c === 0) {
            // No solution
            return [ ];
        } else {
            var t = (a - b) / (a - b * 2 + c);

            if (t >= 0 && t <= 1) {
                return [ t ];
            } else {
                return [ ];
            }
        }
    }

    function bezierComponentExtremes4(a, b, c, d) {
        if (-a + b * 3 - c * 3 + d === 0) {
            var bot = (a - b * 2 + c) * 2;

            if (bot === 0) {
                // No solution
                return [ ];
            } else {
                return [ (a - b) / bot ];
            }
        } else {
            var sqrt = Math.sqrt(-a * c + a * d + b * b - b * c - b * d + c * c);
            var bot = -a + b * 3 - c * 3 + d;

            if (bot === 0) {
                // No solution
                return [ ];
            }

            var add = -a + b * 2 - c;
            var t1 = ( sqrt + add) / bot;
            var t2 = (-sqrt + add) / bot;

            var ret = [ ];
            if (t1 >= 0 && t1 <= 1) ret.push(t1);
            if (t2 >= 0 && t2 <= 1) ret.push(t2);
            return ret;
        }
    }

    function bezierComponentExtremes(components) {
        switch (components.length) {
        case 2:  return [ ];
        case 3:  return bezierComponentExtremes3.apply(null, components);
        case 4:  return bezierComponentExtremes4.apply(null, components);
        default: throw new Error('Don\'t know how to get bounds bezier of order ' + (components.length - 1));
        }
    }

    function getBezierBounds(bezier) {
        // I don't know how to calculate component extremes for Beziers of
        // order > 4, so we'll have to settle with a really lousy method for
        // now.
        if (bezier.length > 3) {
            return [
                [ Math.min.apply(Math, xs(bezier)), Math.min.apply(Math, ys(bezier)) ],
                [ Math.max.apply(Math, xs(bezier)), Math.max.apply(Math, ys(bezier)) ]
            ];
        }

        var extremeT = [ 0, 1 ];

        var xExtremeT = bezierComponentExtremes(xs(bezier)).concat(extremeT);
        var yExtremeT = bezierComponentExtremes(ys(bezier)).concat(extremeT);

        var xExtremes = xExtremeT.map(function (t) { return getBezierPointAt(t, bezier)[0]; });
        var yExtremes = yExtremeT.map(function (t) { return getBezierPointAt(t, bezier)[1]; });

        var xMin = Math.min.apply(Math, xExtremes);
        var yMin = Math.min.apply(Math, yExtremes);
        var xMax = Math.max.apply(Math, xExtremes);
        var yMax = Math.max.apply(Math, yExtremes);

        return [
            [ xMin, yMin ],
            [ xMax, yMax ]
        ];
    }

    function getBezierBestFitBounds(bezier) {
        // TODO Share code duplicated with getBezierBestFitBox

        // Simply rotate the Bezier so the first and last points are axis-aligned,
        // then take the bounds of that bezier.
        var centre = bezier[0];
        var last = bezier[bezier.length - 1];
        var angle = Math.atan2(last[1] - centre[1], last[0] - centre[0]);
        var sin = Math.sin(-angle);
        var cos = Math.cos(-angle);

        var neoBezier = bezier.map(function (point) {
            var x = point[0] - centre[0];
            var y = point[1] - centre[1];

            return [
                x * cos - y * sin,
                x * sin + y * cos
            ];
        });

        return getBezierBounds(neoBezier);
    }

    function flattenBezierBbox(bezier, threshold) {
        // With this algorithm, we subdivide the Bezier until we get really thin
        // bounding boxes.  "Really thin" is defined by threshold, which is in x,y
        // coordinate space units.
        var bbox = getBezierBestFitBounds(bezier);
        var vx = bbox[0][0] - bbox[1][0];
        var vy = bbox[0][1] - bbox[1][1];

        if (Math.abs(vx) < threshold || Math.abs(vy) < threshold) {
            return [
                bezier[0],
                bezier[bezier.length - 1]
            ];
        } else {
            // TODO Split somewhere smarter than the middle
            var split = splitBezierAt(0.5, bezier);
            var segs = flattenBezierBbox(split[0], threshold)
                .concat(flattenBezierBbox(split[1], threshold));

            return uniquePoints(segs);
        }
    }

    function offsetBezierNaive(bezier, distance) {
        return bezier.map(function (point, i) {
            var t = i / (bezier.length - 1);
            var derivative = getBezierDerivativeAt(t, bezier);
            return [
                point[0] + -derivative[1] * distance,
                point[1] +  derivative[0] * distance
            ];
        });
    }

    function offsetBezierBbox(bezier, distance, threshold) {
        // This is similar to the algorithm used in flattenBezierBbox.
        var bbox = getBezierBestFitBounds(bezier);
        var vx = bbox[0][0] - bbox[1][0];
        var vy = bbox[0][1] - bbox[1][1];

        if (Math.abs(vx) < threshold || Math.abs(vy) < threshold) {
            var offsetBezier = offsetBezierNaive(bezier, distance);

            var bbox2 = getBezierBestFitBounds(offsetBezier);
            var vx2 = bbox2[0][0] - bbox2[1][0];
            var vy2 = bbox2[0][1] - bbox2[1][1];

            if (Math.abs(vx2) < threshold || Math.abs(vy2) < threshold) {
                return [ offsetBezier ];
            } else {
                // Fall through
            }
        }

        // TODO Split somewhere smarter than the middle
        var split = splitBezierAt(0.5, bezier);
        var segs = offsetBezierBbox(split[0], distance, threshold)
            .concat(offsetBezierBbox(split[1], distance, threshold));

        return segs;
    }

    function offsetBezierBboxWithCircleCapJoint(beziers, distance, tolerance) {
        function cap(centre, nDir) {
            var radius = Math.abs(distance);
            var rootAngle = -Math.atan2(nDir[1] - centre[1], nDir[0] - centre[0]);

            var leftAngle  = rootAngle + Math.PI / 2;
            var rightAngle = rootAngle - Math.PI / 2;

            var circleBeziers = circleToBeziers(radius, leftAngle, rightAngle);
            return translatedBeziersBy(centre[0], centre[1], circleBeziers);
        }

        function joint(centre, left, right) {
            return [ ]; // XXX!
            // Y is inverted because Y is in screen space, not trig space
            var radius = Math.abs(distance);
            var leftAngle  = Math.atan2(-( left[1] - centre[1]),  left[0] - centre[0]);
            var rightAngle = Math.atan2(-(right[1] - centre[1]), right[0] - centre[0]);

            var circleBeziers = circleToBeziers(radius, leftAngle, rightAngle);
            return translatedBeziersBy(centre[0], centre[1], circleBeziers);
        }

        var output = [ ];

        function add(beziers) {
            output.push.apply(output, beziers);
        }

        // Offset curves (no joints or caps yet)
        var bezierSets = beziers.map(function (bezier) {
            return offsetBezierBbox(bezier, distance, tolerance);
        });

        // Add joints and clip curves
        var outputSets = [ ];
        outputSets.push(cap(beziers[0][0], beziers[0][1]));
        outputSets.push(bezierSets[0]);

        var i;
        for (i = 1; i < bezierSets.length; ++i) {
            var leftSet = bezierSets[i - 1];
            var rightSet = bezierSets[i];

            var leftBezier = leftSet[leftSet.length - 1];
            var rightBezier = rightSet[0];

            var centre = beziers[i][0];
            var left = leftBezier[leftBezier.length - 1];
            var right = rightBezier[0];

            // Area is inverted because Y is inverted
            if (-contourArea([ left, centre, right ]) <= 0) {
                // Intersection somewhere
                outputSets.pop();
                var clipped = clipBezierSetsAtIntersection(leftSet, reverseBeziers(rightSet));
                outputSets.push(clipped[0]);
                outputSets.push(reverseBeziers(clipped[1]));
            } else {
                // No intersection; joint away!
                outputSets.push(joint(centre, left, right));
                outputSets.push(rightSet);
            }
        }

        var points = [ ];
        outputSets.forEach(function (set) {
            set.forEach(function (bezier) {
                flattenBezierBbox(bezier, tolerance).forEach(function (point) {
                    points.push(point);
                });
            });
        });

        return uniquePoints(points);
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
            return flattenBezierBbox(rawPoints, TOLERANCE);
        };

        this.flattenContourPoints = function (radius) {
            var beziers = [ rawPoints ];
            var offsetPointsA = offsetBezierBboxWithCircleCapJoint(beziers, radius, TOLERANCE);
            var offsetPointsB = offsetBezierBboxWithCircleCapJoint(reverseBeziers(beziers), radius, TOLERANCE);

            return offsetPointsA.concat(offsetPointsB);
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
