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

    Slider.bezier = function (points, stepCount) {
        // Estimates a bezier curve
        // TODO Linear control points (osu!-specific)

        var out = [ ];

        var step, t;
        var pointCountMinusOne = points.length - 1;

        var processPoint = function (acc, point, pointIndex) {
            var basis = bernstein(pointCountMinusOne, pointIndex, t);

            return [
                basis * point[0] + acc[0],
                basis * point[1] + acc[1]
            ];
        };

        for (step = 0; step <= stepCount; ++step) { 
            t = step / stepCount; // Affects processPoint

            // WTB generators/coroutines/yield/whatever...
            out.push(points.reduce(processPoint, [ 0, 0 ]));
        }

        return out;
    };

    return Slider;
});
