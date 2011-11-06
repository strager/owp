define('Soundboard', [ 'SoundPool' ], function (SoundPool) {
    function Soundboard(assetManager) {
        this.assetManager = assetManager;
        this.soundPools = { };
    }

    Soundboard.prototype = {
        preload: function (soundNames) {
            soundNames.forEach(this.getSoundPool, this);
        },

        getSoundPool: function (soundName) {
            if (!Object.prototype.hasOwnProperty.call(this.soundPools, soundName)) {
                var pool = new SoundPool(this.assetManager.get(soundName, 'sound'));
                pool.prealloc(3);
                this.soundPools[soundName] = pool;

                // Browsers have pretty bad latency problems on the first play.
                // This hack works around that issue.
                var sound = pool.alloc();
                sound.volume = 0;

                function played() {
                    sound.removeEventListener('play', played, false);
                    sound.removeEventListener('timeupdate', played, false);

                    setTimeout(function () {
                        function paused() {
                            sound.removeEventListener('pause', paused, false);

                            // Sound is now "hot" in the browser's cache (or
                            // something), so latency is lower.  Still, we can't
                            // set currentTime because browser are stubborn.  We
                            // work around this with a hacky setTimeout...
                            setTimeout(function () {
                                sound.currentTime = 0;
                                pool.free(sound);
                            }, 1000);
                        }

                        sound.addEventListener('pause', paused, false);
                        sound.pause();
                    }, 500);
                }

                sound.addEventListener('play', played, false);
                sound.addEventListener('timeupdate', played, false);
                sound.play();
            }

            return this.soundPools[soundName];
        },

        playSound: function (soundName, options) {
            var soundPool = this.getSoundPool(soundName);

            var sound = soundPool.alloc();
            sound.addEventListener('ended', function handler() {
                soundPool.free(sound);
                sound.removeEventListener('ended', handler, false);
            }, false);

            Object.keys(options || { }).forEach(function (property) {
                sound[property] = options[property];
            });

            sound.play();
        }
    };

    return Soundboard;
});
