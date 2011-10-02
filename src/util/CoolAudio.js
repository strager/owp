define('util/CoolAudio', [ ], function () {
    // NOTE: HTML5 Audio operates using seconds,
    // whereas our CoolAudio operates using milliseconds.

    // This wrapper gives the current time of an audio element to the best
    // accuracy and precision we can provide.  It also provides features like
    // negative times (for audio lead-in) which are kinda weird in the real
    // world.  Because of all this, we completely wrap the audio element so
    // things don't get out of sync accidentally.

    function CoolAudio(audioElement) {
        this.audioElement = audioElement;

        var self = this;

        // Use Date.now() to determine the audio's time.  Use audio events
        // to know when the audio element was seeked, paused, etc.

        // TODO Handle sample rates

        // The time of the audio's 0:00:00 time, in RTC milliseconds.
        this.rtcStartTime = 0;

        this.isPaused = false;

        function update() {
            var currentTime = self.rawCurrentTime();
            var rtcCurrentTime = Date.now();
            self.rtcStartTime = rtcCurrentTime - currentTime;
            self.isPaused = audioElement.paused;
        }

        var eventNames = [
            // Happy events
            'play', 'pause', 'ratechange', 'seeked', 'ended',
            // Sad events
            'stalled', 'suspend', 'abort', 'error', 'emptied'
        ];

        eventNames.forEach(function (eventName) {
            audioElement.addEventListener(eventName, update, false);
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
        audioElement.addEventListener('timeupdate', function () {
            var computed = Date.now() - self.rtcStartTime;
            var reported = self.rawCurrentTime();

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
    }

    CoolAudio.prototype = {
        pause: function () {
            this.audioElement.pause();
        },

        play: function () {
            this.audioElement.play();
        },

        seek: function (time) {
            // TODO
        },

        currentTime: function () {
            if (this.isPaused) {
                return this.rawCurrentTime();
            }

            return Date.now() - this.rtcStartTime;
        },

        rawCurrentTime: function () {
            return this.audioElement.currentTime * 1000;
        }
    };

    return CoolAudio;
});
