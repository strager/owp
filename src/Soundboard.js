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
                this.soundPools[soundName] = new SoundPool(this.assetManager.get(soundName, 'sound'));
                this.soundPools[soundName].prealloc(3);
            }

            return this.soundPools[soundName];
        },

        playSound: function (soundName, options) {
            var soundPool = this.getSoundPool(soundName);

            var sound = soundPool.alloc();
            sound.addEventListener('ended', function () {
                soundPool.free(sound);
            }, false);

            Object.keys(options || { }).forEach(function (property) {
                sound[property] = options[property];
            });

            sound.play();
        }
    };

    return Soundboard;
});
