define('Util/audioTimer', [ ], function () {
    // These functions give the current time of an audio element to the best
    // accuracy and precision we can provide.

    function raw(audio) {
        // Use the audio's currentTime property.  This is not very
        // accurate in some browsers, hence the alternatives.

        return function () {
            return audio.currentTime * 1000;
        };
    }

    function date(audio) {
        // Use Date.now() to determine the audio's time.  Use audio events
        // to know when the audio element was seeked, paused, etc.

        // TODO Handle sample rates

        // The time of the audio's 0:00:00 time, in RTC milliseconds.
        var rtcStartTime = 0;

        var isPaused = false;

        var audioCurrentTime = raw(audio);

        function update() {
            var currentTime = audioCurrentTime();
            var rtcCurrentTime = Date.now();
            rtcStartTime = rtcCurrentTime - currentTime;
            isPaused = audio.paused;
        }

        var eventNames = [
            // Happy events
            'play', 'pause', 'ratechange', 'seeked', 'ended',
            // Sad events
            'stalled', 'suspend', 'abort', 'error', 'emptied'
        ];

        eventNames.forEach(function (eventName) {
            audio.addEventListener(eventName, update, false);
        });

        // This is a workaround for Firefox's refusal to give sane currentTime
        // values on timeupdate.  Basically, Firefox can send us (say) 18 ms
        // into the past, then on the next timeupdate 18 ms into the future.
        // This causes terrible jittery gameplay *even on good machines*, which
        // is completely unacceptable.
        // The workaround here is by no means perfect, but it's effective
        // enough to prevent random jitters and to prevent the music being
        // totally off after lag.
        var lastDiff = 0;
        var diffThreshold = 15;
        audio.addEventListener('timeupdate', function () {
            var computed = Date.now() - rtcStartTime;
            var reported = audioCurrentTime();

            var diff = computed - reported;

            if ((diff >  diffThreshold && lastDiff >  diffThreshold)
             || (diff < -diffThreshold && lastDiff < -diffThreshold)) {
                update();
                lastDiff = 0;
            } else {
                lastDiff = diff;
            }
        }, false);

        update();

        return function () {
            if (isPaused) {
                return audioCurrentTime();
            }

            return Date.now() - rtcStartTime;
        };
    }

    function auto(audio) {
        // Just pick one already!

        return date(audio);
    }

    return {
        auto: auto,
        raw: raw,
        date: date
    };
});
