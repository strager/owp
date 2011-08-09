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
