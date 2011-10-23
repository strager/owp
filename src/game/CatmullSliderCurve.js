define('game/CatmullSliderCurve', [ 'util/util', 'game/BezierSliderCurve' ], function (util, BezierSliderCurve) {
    function render(rawPoints, stepCount, maxLength) {
        // Estimates a Catmull-Rom curve
        // TODO Adaptive rendering
        // (... yeah right; no one maps with this shit)

        var out = [ ];

        var step, curPoint;
        var lastPoint = null;
        var currentLength = 0;

        var i, c;
        var p0, p1, p2, p3;
        var t, t2, t3;

        for (i = 0; i < rawPoints.length; ++i) {
            p0 = rawPoints[i - 1] || rawPoints[0];
            p1 = rawPoints[i + 0];
            p2 = rawPoints[i + 1] || rawPoints[i];
            p3 = rawPoints[i + 2] || rawPoints[i + 1] || rawPoints[i];

            // q(t) = 0.5 *
            //   ( (2 * P1)
            //   + (-P0 + P2) * t
            //   + (2*P0 - 5*P1 + 4*P2 - P3) * t2
            //   + (-P0 + 3*P1- 3*P2 + P3) * t3
            //   )
            for (step = 0; step < stepCount; ++step) {
                t = step / stepCount;
                t2 = t * t;
                t3 = t * t2;

                curPoint = [ 0, 0 ];

                for (c = 0; c < 2; ++c) {
                    curPoint[c] = 0.5 *
                        ( 2 * p1[c]
                        + (-p0[c] + p2[c]) * t
                        + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2
                        + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3
                        );
                }

                if (lastPoint) {
                    var deltaX = curPoint[0] - lastPoint[0];
                    var deltaY = curPoint[1] - lastPoint[1];

                    var length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    curPoint[3] = deltaX / length;
                    curPoint[4] = deltaY / length;

                    currentLength += length;
                }

                curPoint[2] = currentLength;

                if (currentLength >= maxLength) {
                    break;
                }

                out.push(curPoint);

                lastPoint = curPoint;
            }
        }

        return out;
    }

    function addPoints(a, b) {
        return [
            a[0] + b[0],
            a[1] + b[1],
            (a[2] || 0) + (b[2] || 0)
        ];
    }

    function segmentLength(seg) {
        var dx = seg[0][0] - seg[1][0];
        var dy = seg[0][1] - seg[1][1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function segmentDerivative(seg) {
        var dx = seg[0][0] - seg[1][0];
        var dy = seg[0][1] - seg[1][1];
        var len = Math.sqrt(dx * dx + dy * dy);

        return [
            dx / len,
            dy / len
        ];
    }

    function CatmullSliderCurve(rawPoints, sliderLength) {
        if (rawPoints.length === 2) {
            // Bezier curve implementation is more optimal and Catmulls are
            // bugged with two points anyway, so just reuse the Bezier
            // implementation.
            return new BezierSliderCurve(rawPoints, sliderLength);
        }

        this.length = sliderLength;

        var points = render(rawPoints, 50, this.length);
        var startPoint = points[0];
        var endPoint = points.slice(-1)[0];

        var self = this;
        this.offset = [ 0, 0 ];
        function offset(point) {
            return addPoints(point, self.offset);
        }

        this.flattenCentrePoints = function () {
            return points.map(function (point) {
                return point.slice();
            });
        };

        this.flattenContourPoints = util.memoize2(function (radius) {
            // TODO End caps
            // TODO Initial point

            var output = [ ];

            var i;
            for (i = 1; i < points.length; ++i) {
                var p = points[i];
                var d = segmentDerivative([ p, points[i - 1] ]);

                output.push([
                    p[0] + d[1] * radius,
                    p[1] - d[0] * radius
                ]);
                output.push([
                    p[0] - d[1] * radius,
                    p[1] + d[0] * radius
                ]);
            }

            // Reverse the points so polies toward the end of the slider are
            // rendered first (thus showing "behind").
            points.reverse();

            return points;
        });

        this.getStartPoint = function () {
            return offset(startPoint);
        };

        this.getEndPoint = function () {
            return offset(endPoint);
        };

        this.getPointAtLength = function (length) {
            if (length < 0) {
                return offset(startPoint);
            }

            if (length >= sliderLength) {
                return offset(endPoint);
            }

            var curLength = 0;
            var lastPoint = points[0];
            var i;
            for (i = 1; i < points.length; ++i) {
                var thisPoint = points[i];
                var segLength = segmentLength([ lastPoint, thisPoint ]);

                if (curLength + segLength >= length) {
                    var t = (length - curLength) / segLength;
                    return offset([
                        (thisPoint[0] - lastPoint[0]) * t + lastPoint[0],
                        (thisPoint[1] - lastPoint[1]) * t + lastPoint[1]
                    ]);
                }

                curLength += segLength;
                lastPoint = thisPoint;
            }

            return offset(endPoint);
        };
    }

    return CatmullSliderCurve;
});
