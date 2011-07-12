define('Util/FramerateCounter', [ ], function () {
    function FramerateCounter() {
        this.ticks = 0;

        this.lastFramerate = null;
        this.framerate = NaN;

        this.lastMeasure = null;
        this.measureFrequency = 1000; // every second
    }

    FramerateCounter.prototype.addTick = function () {
        return this.addTicks(1);
    };

    FramerateCounter.prototype.addTicks = function (tickCount) {
        this.ticks += tickCount;

        this.check();
    };

    FramerateCounter.prototype.update = function () {
        this.addTicks(0);
    };

    FramerateCounter.prototype.check = function () {
        var now = Date.now();

        if (this.lastMeasure === null) {
            this.lastMeasure = now;
        }

        if (this.lastMeasure + this.measureFrequency <= now) {
            // At least one second has passed

            // frames / second = frames / (millisecond / 1000)
            //                 = frames * 1000 / millisecond
            this.framerate = this.ticks * 1000 / (now - this.lastMeasure);

            this.lastMeasure = now;
            this.ticks = 0;
        }
    };

    return FramerateCounter;
});
