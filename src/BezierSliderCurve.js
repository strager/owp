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

    function isUnitBezier(bezier) {
        var a = bezier[0];
        var i, b;
        for (i = 1; i < bezier.length; ++i) {
            b = bezier[i];
            if (!approxEqual(a[0], b[0]) || !approxEqual(a[1], b[1])) {
                return false;
            }
        }

        return true;
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

    function contourArea(contour) {
        contour = contour.concat([ contour[0] ]);

        var i, a = 0;
        for (i = 0; i < contour.length - 1; ++i) {
            a += contour[i][1] * contour[i + 1][0] -
                 contour[i][0] * contour[i + 1][1];
        }

        return a / 2;
    }

    function areBoundsIntersecting(a, b) {
        // Accepts zero-width and zero-height bounds
        return (
            a[0][0] <= b[1][0] && // leftA <= rightB
            a[1][0] >= b[0][0] && // rightA >= leftB
            a[0][1] <= b[1][1] && // topA <= bottomB
            a[1][1] >= b[0][1]    // bottomA >= topB
        );
    }

    function getLineSegmentIntersections(segA, segB) {
        // Helper variables to make copying from Wikipedia easier
        var x1 = segA[0][0];
        var y1 = segA[0][1];
        var x2 = segA[1][0];
        var y2 = segA[1][1];

        var x3 = segB[0][0];
        var y3 = segB[0][1];
        var x4 = segB[1][0];
        var y4 = segB[1][1];

        var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        var m = (x1 * y2 - y1 * x2);
        var n = (x3 * y4 - y3 * x4);

        var x = (m * (x3 - x4) - n * (x1 - x2)) / den;
        var y = (m * (y3 - y4) - n * (y1 - y2)) / den;

        // Make sure we are part of the *segment*
        var minXA = Math.min(x1, x2);
        var minXB = Math.min(x3, x4);
        var maxXA = Math.max(x1, x2);
        var maxXB = Math.max(x3, x4);

        if (x < minXA || x < minXB) return [ ];
        if (x > maxXA || x > maxXB) return [ ];

        var minYA = Math.min(y1, y2);
        var minYB = Math.min(y3, y4);
        var maxYA = Math.max(y1, y2);
        var maxYB = Math.max(y3, y4);

        if (y < minYA || y < minYB) return [ ];
        if (y > maxYA || y > maxYB) return [ ];

        return [ [ x, y ] ];
    }

    function areLineSegmentsIntersecting(a, b) {
        return getLineSegmentIntersections(a, b).length > 0;
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

        var quads = [
            quad( 1, -1),
            quad(-1, -1).reverse(),
            quad(-1,  1),
            quad( 1,  1).reverse()
        ];

        var beziers = [ ];
        var q;
        for (q = 0; q < 4; ++q) {
            var ta = 0;
            var tb = clamp(q, angle, q + 1) - q;

            if (ta !== tb) {
                beziers.push(splitBezierAtMany([ ta, tb ], quads[q])[1]);
            }
        }

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

    function flattenBezierSetBbox(bezierSet, tolerance) {
        var points = [ ];

        bezierSet.forEach(function (bezier) {
            flattenBezierBbox(bezier, tolerance).forEach(function (point) {
                points.push(point);
            });
        });

        return uniquePoints(points);
    }

    function flattenBezierSetsBbox(bezierSets, tolerance) {
        var points = [ ];

        bezierSets.forEach(function (set) {
            points.push.apply(points, flattenBezierSetBbox(set, tolerance));
        });

        return uniquePoints(points);
    }

    function getBezierIntersectionTs(bezierA, bezierB) {
        // Like getBezierIntersections, but instead of giving a point, we give the
        // t values at which the Beziers intersect.
        // [ bezierAIntersectionTs, bezierBIntersectionTs ]

        var boundsA = getBezierBounds(bezierA);
        var boundsB = getBezierBounds(bezierB);

        if (!areBoundsIntersecting(boundsA, boundsB)) {
            // If the bounds aren't intersecting, the Beziers certainly are not!
            return [ [ ], [ ] ];
        }

        var boundsAArea = (boundsA[1][0] - boundsA[0][0]) * (boundsA[1][1] - boundsA[0][1]);
        var boundsBArea = (boundsB[1][0] - boundsB[0][0]) * (boundsB[1][1] - boundsB[0][1]);

        if (boundsAArea <= 4 && boundsBArea <= 4) {
            if (areLineSegmentsIntersecting(
                [ bezierA[0], bezierA[bezierA.length - 1] ],
                [ bezierB[0], bezierB[bezierB.length - 1] ]
            )) {
                // TODO Moar accuracy!
                return [ [ 0.5 ], [ 0.5 ] ];
            } else {
                return [ [ ], [ ] ];
            }
        }

        var subBeziersA = splitBezierAt(0.5, bezierA);
        var subBeziersB = splitBezierAt(0.5, bezierB);

        function tScaler(side) {
            if (side === 0) {
                return function scaleT(t) {
                    return t * 0.5;
                };
            } else {
                return function scaleT(t) {
                    return t * 0.5 + 0.5;
                };
            }
        }

        // Get intersection lists among the four split beziers
        return [
            [ 0, 0 ],
            [ 0, 1 ],
            [ 1, 0 ],
            [ 1, 1 ]
        ].reduce(function (acc, pair) {
            var subBezierA = subBeziersA[pair[0]];
            var subBezierB = subBeziersB[pair[1]];

            var subTs = getBezierIntersectionTs(subBezierA, subBezierB);

            // t's need to be scaled to bezierA/bezierB t space
            var subATs = subTs[0].map(tScaler(pair[0]));
            var subBTs = subTs[1].map(tScaler(pair[1]));

            return [
                acc[0].concat(subATs),
                acc[1].concat(subBTs)
            ];
        }, [ [ ], [ ] ]);
    }

    function clipBezierSetsAtIntersection(bezierSetA, bezierSetB) {
        var tAs = [ ];
        var tBs = [ ];

        var i, j;
        for (i = 0; i < bezierSetA.length; ++i) {
            for (j = 0; j < bezierSetB.length; ++j) {
                var ts = getBezierIntersectionTs(bezierSetA[i], bezierSetB[j]);
                tAs = tAs.concat(ts[0].map(function (t) { return t + i; }));
                tBs = tBs.concat(ts[1].map(function (t) { return t + j; }));
            }
        }

        var tA = Math.min.apply(Math, tAs);
        var tB = tBs[tAs.indexOf(tA)];

        var newSetA, newSetB;

        if (tA < bezierSetA.length) {
            newSetA = bezierSetA.slice(0, Math.floor(tA)).concat([
                splitBezierAt(tA % 1, bezierSetA[Math.floor(tA)])[0]
            ])
        } else {
            newSetA = bezierSetA;
        }

        if (tB < bezierSetB.length) {
            newSetB = bezierSetB.slice(0, Math.floor(tB)).concat([
                splitBezierAt(tB % 1, bezierSetB[Math.floor(tB)])[0]
            ])
        } else {
            newSetB = bezierSetB;
        }

        return [ newSetA, newSetB ];
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

    function simplifyBezierBboxTransport(bezier, distance, threshold, offsetThreshold) {
        // Similar to the simplifyBezierBbox algorithm, except we compare the
        // derivatives of the start and end as well.
        var bbox = getBezierBestFitBounds(bezier);
        var vx = bbox[0][0] - bbox[1][0];
        var vy = bbox[0][1] - bbox[1][1];

        if (Math.abs(vx) < threshold || Math.abs(vy) < threshold) {
            var offsetBezier2 = offsetBezierNaive(bezier, distance);
            var bbox2 = getBezierBestFitBounds(offsetBezier2);
            var vx2 = bbox2[0][0] - bbox2[1][0];
            var vy2 = bbox2[0][1] - bbox2[1][1];

            var offsetBezier3 = offsetBezierNaive(reverseBezier(bezier), distance);
            var bbox3 = getBezierBestFitBounds(offsetBezier3);
            var vx3 = bbox3[0][0] - bbox3[1][0];
            var vy3 = bbox3[0][1] - bbox3[1][1];

            if ((Math.abs(vx2) < offsetThreshold || Math.abs(vy2) < offsetThreshold)
             && (Math.abs(vx3) < offsetThreshold || Math.abs(vy3) < offsetThreshold)) {
                return [ bezier ];
            } else {
                // Fall through
            }
        }

        // TODO Split somewhere smarter than the middle
        var split = splitBezierAt(0.5, bezier);
        return simplifyBezierBboxTransport(split[0], distance, threshold, offsetThreshold)
            .concat(simplifyBezierBboxTransport(split[1], distance, threshold, offsetThreshold));
    }

    function approxBezierLength(bezier) {
        // This, of course, approximates length
        var p1 = bezier[0];
        var p2 = bezier[bezier.length - 1];
        var dx = p1[0] - p2[0];
        var dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function clipTransportBeziersAtLength(length, beziers, distance, tolerance, offsetThreshold) {
        // TODO Use bbox method instead

        var nbeziers = beziers.reduce(function (acc, bezier) {
            return simplifyBezierBboxTransport(bezier, distance, tolerance, offsetThreshold);
        }, [ ]);

        var output = [ ];

        var curLength = 0;
        var i;
        for (i = 0; i < nbeziers.length; ++i) {
            var segLength = approxBezierLength(nbeziers[i]);

            if (curLength + segLength >= length) {
                output.push(
                    splitBezierAt((length - curLength) / segLength, nbeziers[i])[0]
                );

                break;
            }

            curLength += segLength;
            output.push(nbeziers[i]);
        }

        return output;
    }

    function uv(point, u) {
        return point.slice(0, 2).concat([ u ]).concat(point.slice(3));
    }

    function triangleStripBezier(centre, bezier, tolerance) {
        var points = flattenBezierBbox(bezier, tolerance);
        var ncentre = uv(centre, 0);

        return points.reduce(function (acc, point) {
            return acc.concat([ ncentre, uv(point, 1) ]);
        }, [ ]);
    }

    function transportStrokeBezier(bezier, distance, tolerance, offsetThreshold) {
        var nbeziers = simplifyBezierBboxTransport(bezier, distance, tolerance, offsetThreshold);

        var t = getBezierDerivativeAt(0, nbeziers[0]);
        var p = getBezierPointAt(0, nbeziers[0]);
        var extrudedA = [ p[0] +  t[1] * distance, p[1] + -t[0] * distance, -1 ];
        var extrudedB = [ p[0] + -t[1] * distance, p[1] +  t[0] * distance,  1 ];
        var init = [ extrudedA, extrudedB ];

        return nbeziers.reduce(function (acc, nbezier) {
            var t = getBezierDerivativeAt(1, nbezier);
            var p = getBezierPointAt(1, nbezier);
            var extrudedA = [ p[0] +  t[1] * distance, p[1] + -t[0] * distance, -1 ];
            var extrudedB = [ p[0] + -t[1] * distance, p[1] +  t[0] * distance,  1 ];

            return acc.concat([ extrudedA, extrudedB ]);
        }, init);
    }

    function transportStrokeBeziers(beziers, distance, tolerance, offsetThreshold) {
        function cap(centre, nDir) {
            var radius = Math.abs(distance);
            var rootAngle = -Math.atan2(nDir[1] - centre[1], nDir[0] - centre[0]);

            var leftAngle  = rootAngle + Math.PI / 2;
            var rightAngle = rootAngle - Math.PI / 2;

            var circleBeziers = circleToBeziers(radius, leftAngle, rightAngle);
            var points = circleBeziers.reduce(function (acc, bezier) {
                return acc.concat(triangleStripBezier([ 0, 0 ], bezier, tolerance));
            }, [ ]);

            return points.map(function (point) {
                return [
                    point[0] + centre[0],
                    point[1] + centre[1],
                    point[2]
                ];
            });
        }

        function joint(centre, left, right, distance) {
            // Y is inverted because Y is in screen space, not trig space
            var radius = Math.abs(distance);
            var leftAngle  = Math.atan2(-( left[1] - centre[1]),  left[0] - centre[0]);
            var rightAngle = Math.atan2(-(right[1] - centre[1]), right[0] - centre[0]);

            var circleBeziers = circleToBeziers(radius, leftAngle, rightAngle);
            var points = circleBeziers.reduce(function (acc, bezier) {
                return acc.concat(triangleStripBezier([ 0, 0 ], bezier, tolerance));
            }, [ ]);

            return points.map(function (point) {
                return [
                    point[0] + centre[0],
                    point[1] + centre[1],
                    point[2]
                ];
            });
        }

        var transportPoints = beziers.map(function (bezier) {
            return transportStrokeBezier(bezier, distance, tolerance, offsetThreshold);
        });

        var outputPoints = [ ];
        outputPoints.push.apply(outputPoints, cap(beziers[0][0], beziers[0][1]));
        outputPoints.push.apply(outputPoints, transportPoints[0]);

        var i;
        for (i = 1; i < transportPoints.length; ++i) {
            // Add a joint
            var centre = beziers[i][0];

            var leftA = transportPoints[i][0];
            var rightA = transportPoints[i - 1].slice(-2)[0];

            // Area is inverted because Y is inverted
            if (-contourArea([ leftA, centre, rightA ]) > 0) {
                outputPoints.push.apply(outputPoints, joint(centre, leftA, rightA, distance).reverse());
            }

            var leftB = transportPoints[i - 1].slice(-1)[0];
            var rightB = transportPoints[i][1];

            // Area is inverted because Y is inverted
            if (-contourArea([ leftB, centre, rightB ]) > 0) {
                outputPoints.push.apply(outputPoints, joint(centre, leftB, rightB, distance).reverse());
            }

            outputPoints.push.apply(outputPoints, transportPoints[i]);
        }

        outputPoints.push.apply(outputPoints, cap(beziers[beziers.length - 1].slice(-1)[0], beziers[beziers.length - 1].slice(-2)[0]));

        return outputPoints;
    }

    function rawPointsToBezierSet(rawPoints) {
        var set = [ ];
        var currentBezier = [ ];
        var lastPoint = null, thisPoint;
        var i;

        for (i = 0; i < rawPoints.length; ++i) {
            thisPoint = rawPoints[i];

            if (lastPoint && lastPoint[0] === thisPoint[0] && lastPoint[1] === thisPoint[1]) {
                set.push(currentBezier);
                currentBezier = [ ];
            }

            currentBezier.push(thisPoint);
            lastPoint = thisPoint;
        }

        if (currentBezier.length) {
            set.push(currentBezier);
        }

        return set;
    }

    function BezierSliderCurve(rawPoints, sliderLength) {
        this.length = sliderLength;

        var beziers = rawPointsToBezierSet(rawPoints);
        beziers = clipTransportBeziersAtLength(sliderLength, beziers, 100, TOLERANCE, TOLERANCE);

        var startPoint = beziers[0][0];
        var endPoint = beziers.slice(-1)[0].slice(-1)[0];

        this.flattenCentrePoints = function () {
            return flattenBezierSetBbox(beziers, TOLERANCE);
        };

        this.flattenContourPoints = function (radius) {
            return transportStrokeBeziers(beziers, radius, TOLERANCE, TOLERANCE);
        };

        this.getStartPoint = function () {
            return startPoint;
        };

        this.getEndPoint = function () {
            return endPoint;
        };

        this.getPointAtLength = function (length) {
            if (length < 0) {
                return startPoint;
            }

            if (length >= sliderLength) {
                return endPoint;
            }

            var curLength = 0;
            var i;
            for (i = 0; i < beziers.length; ++i) {
                var segLength = approxBezierLength(beziers[i]);

                if (curLength + segLength >= length) {
                    return getBezierPointAt((length - curLength) / segLength, beziers[i]);
                }

                curLength += segLength;
            }

            return endPoint;
        };
    }

    return BezierSliderCurve;
});
