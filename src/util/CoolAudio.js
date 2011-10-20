define('util/CoolAudio', [ 'util/PubSub' ], function (PubSub) {
    // NOTE: HTML5 Audio operates using seconds,
    // whereas our CoolAudio operates using milliseconds.

    // This wrapper gives the current time of an audio element to the best
    // accuracy and precision we can provide.  It also provides features like
    // negative times (for audio lead-in) which are kinda weird in the real
    // world.  Because of all this, we completely wrap the audio element so
    // things don't get out of sync accidentally.

    // NOTE: This code is super flaky and anything can break it.  Anything.

    // How many milliseconds 'late' a setInterval/setTimeout can occur before
    // nothing is done.
    var LOOKBEHIND_THRESHOLD = -8;

    function CoolAudio(audioElement) {
        this.audioElement = audioElement;

        var self = this;

        this.events = {
            seek: new PubSub(),
            start: new PubSub(),
            stop: new PubSub()
        };

        this.timeoutClearCallbacks = { };
        this.timeoutId = 0;

        // Use Date.now() to determine the audio's time.  Use audio events
        // to know when the audio element was seeked, paused, etc.

        // TODO Handle sample rates

        // The time of the audio's 0:00:00 time, in RTC milliseconds.
        this.rtcStartTime = 0;

        this.isPaused = false;

        this.negativeZone = false;
        this.negativeZoneTimer = null;
        this.negativeZoneTime = 0;

        function update() {
            if (self.negativeZone) {
                return;
            }

            var currentTime = self.rawCurrentTime();
            var rtcCurrentTime = Date.now();
            self.rtcStartTime = rtcCurrentTime - currentTime;
            self.isPaused = audioElement.paused;

            self.events.seek.publish(self);
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
            if (this.isPaused) {
                return;
            }

            this.isPaused = true;
            this.audioElement.pause();

            if (this.negativeZone) {
                if (this.negativeZoneTimer !== null) {
                    window.clearTimeout(this.negativeZoneTimer);
                    this.negativeZoneTimer = null;
                }

                this.negativeZoneTime = Date.now() - this.rtcStartTime;
            }

            this.events.stop.publish(this);
        },

        play: function () {
            if (!this.isPaused) {
                return;
            }

            this.isPaused = false;

            if (this.negativeZone) {
                var self = this;

                if (self.negativeZoneTimer !== null) {
                    window.clearTimeout(self.negativeZoneTimer);
                    self.negativeZoneTimer = null;
                }

                self.rtcStartTime = Date.now() - self.negativeZoneTime;

                self.negativeZoneTimer = window.setTimeout(function () {
                    self.negativeZone = false;

                    var ct = Date.now() - self.rtcStartTime;
                    self.audioElement.currentTime = ct / 1000;
                    self.audioElement.play();
                }, -self.negativeZoneTime);
            } else {
                this.audioElement.play();
            }

            this.events.start.publish(this);
        },

        seek: function (time) {
            if (time < 0) {
                var self = this;
                var paused = self.isPaused;

                if (!paused) {
                    self.pause();
                }

                self.negativeZone = true;
                self.negativeZoneTime = time;

                if (paused) {
                    return;
                }

                self.play();
            } else {
                var ct = time / 1000;
                this.audioElement.currentTime = ct;
            }

            this.events.seek.publish(this);
        },

        canSeek: function (time) {
            if (time < 0) {
                return true;
            } else {
                var tr = this.audioElement.seekable;
                if (!tr) {
                    return false;
                }

                var t = time / 1000;
                var i;
                for (i = 0; i < tr.length; ++i) {
                    if (tr.start(i) <= t && t <= tr.end(i)) {
                        return true;
                    }
                }

                return false;
            }
        },

        currentTime: function () {
            if (this.isPaused) {
                if (this.negativeZone) {
                    return this.negativeZoneTime;
                } else {
                    return this.rawCurrentTime();
                }
            }

            return Date.now() - this.rtcStartTime;
        },

        rawCurrentTime: function () {
            return this.audioElement.currentTime * 1000;
        },

        setTimeout: function (callback, time, context) {
            // Fire callback when time is reached, once

            var id = null;
            var clear = false;
            id = this.setInterval(function () {
                if (id === null) {
                    clear = true;
                } else {
                    this.clearTimeout(id);
                }

                callback.call(context);
            }, time, this);

            if (clear) {
                this.clearTimeout(id);
            }

            return id;
        },

        setInterval: function (callback, time, context) {
            // Fire callback when time is reached, every time
            // **NOT** guaranteed to execute callback in next turn of event
            // loop!

            var timerId = null;
            var self = this;

            function start() {
                stop();

                var dt = time - self.currentTime();

                if (dt > LOOKBEHIND_THRESHOLD) {
                    if (dt < 1) {
                        callback.call(context);
                    } else {
                        timerId = window.setTimeout(function () {
                            timerId = null;
                            callback.call(context);
                        }, dt);
                    }
                }
            }

            function stop() {
                if (timerId !== null) {
                    window.clearTimeout(timerId);
                    timerId = null;
                }
            }

            function seek() {
                if (!this.isPaused) {
                    start();
                }
            }

            var boundEvents = [ ];

            function clear() {
                stop();

                var boundEvent;
                while ((boundEvent = boundEvents.pop())) {
                    boundEvent.unsubscribe();
                }

                delete self.timeoutClearCallbacks[id];
            }

            boundEvents.push(this.events.start.subscribe(start));
            boundEvents.push(this.events.stop.subscribe(stop));
            boundEvents.push(this.events.seek.subscribe(seek));

            seek();

            var id = this.timeoutId;
            ++this.timeoutId;
            this.timeoutClearCallbacks[id] = clear;
            return id;
        },

        clearTimeout: function (id) {
            this.timeoutClearCallbacks[id]();
        }
    };

    return CoolAudio;
});
