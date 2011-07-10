define('TimingPoint', [ ], function () {
    function TimingPoint(time, bpm, isInherited) {
        this.time = time;
        this.bpm = bpm;
        this.isInherited = isInherited;
    }

    TimingPoint.prototype.getEffectiveBPM = function (parent) {
        if (this.isInherited) {
            return this.bpm * parent.getEffectiveBPM();
        } else {
            return this.bpm;
        }
    }

    return TimingPoint;
});
