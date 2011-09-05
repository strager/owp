define('game/CatmullSliderCurve', [ ], function () {
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

    function CatmullSliderCurve(rawPoints, sliderLength) {
        this.length = sliderLength;
        this.points = render(rawPoints, 50, this.length);
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

    CatmullSliderCurve.prototype.getTickPositions = function (tickLength) {
        var ticks = [ ];
        var i, pointIndex;

        for (i = 1; i < Math.floor(this.length / tickLength); ++i) {
            // TODO smarter calculation
            pointIndex = getLengthIndex(this.points, tickLength * i);
            ticks.push(this.points[pointIndex]);
        }

        return ticks;
    };

    CatmullSliderCurve.prototype.getSliderBallPosition = function (object, time, ruleSet) {
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

    CatmullSliderCurve.prototype.render = function (percentage) {
        var index = getLengthIndex(this.points, this.length * percentage);

        if (index >= 0) {
            return this.points.slice(0, index);
        } else {
            return this.points.slice();
        }
    };

    return CatmullSliderCurve;
});
