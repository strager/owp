define('Soundboard', [ 'jQuery', 'SoundPool' ], function ($, SoundPool) {
    var Soundboard = function (assetManager) {
        this.assetManager = assetManager;
        this.soundPools = { };
    };

    Soundboard.prototype = {
        getSoundPool: function (soundName) {
            if (!Object.prototype.hasOwnProperty.call(this.soundPools, soundName)) {
                this.soundPools[soundName] = new SoundPool(this.assetManager.get(soundName, 'sound'));
            }

            return this.soundPools[soundName];
        },

        playSound: function (soundName) {
            var soundPool = this.getSoundPool(soundName);

            var sound = soundPool.alloc();
            $(sound).one('ended', function () {
                soundPool.free(sound);
            });
            sound.play();
        }
    };

    return Soundboard;
});
