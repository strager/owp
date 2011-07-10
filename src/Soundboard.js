define('Soundboard', [ 'jQuery', 'SoundPool' ], function ($, SoundPool) {
    function Soundboard(assetManager) {
        this.assetManager = assetManager;
        this.soundPools = { };
    }

    Soundboard.prototype = {
        getSoundPool: function (soundName) {
            if (!Object.prototype.hasOwnProperty.call(this.soundPools, soundName)) {
                this.soundPools[soundName] = new SoundPool(this.assetManager.get(soundName, 'sound'));
            }

            return this.soundPools[soundName];
        },

        playSound: function (soundName, options) {
            var soundPool = this.getSoundPool(soundName);

            var sound = soundPool.alloc();
            $(sound).one('ended', function () {
                soundPool.free(sound);
            });

            Object.keys(options || { }).forEach(function (property) {
                sound[property] = options[property];
            });

            sound.play();
        }
    };

    return Soundboard;
});
