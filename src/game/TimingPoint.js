define('game/TimingPoint', [ ], function () {
    function TimingPoint(options) {
        this.time = options.time;
        this.bpm = options.bpm;
        this.isInherited = options.isInherited;
        this.hitSoundVolume = options.hitSoundVolume;
        this.sampleSet = options.sampleSet;
    }

    TimingPoint.generic = function () {
        return new TimingPoint({
            time: 0,
            bpm: 120,
            isInherited: false,
            hitSoundVolume: 1,
            sampleSet: 'normal'
        });
    };

    TimingPoint.prototype.getEffectiveBPM = function (parent) {
        if (this.isInherited) {
            return this.bpm * parent.getEffectiveBPM();
        } else {
            return this.bpm;
        }
    };

    return TimingPoint;
});
