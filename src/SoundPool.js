define('SoundPool', [ 'jQuery' ], function ($) {
    var SoundPool = function (sound) {
        this.sourceSound = sound;
        this.freeSounds = [ ];
        this.takenSounds = [ ];
    };

    SoundPool.prototype = {
        alloc: function () {
            var sound = this.freeSounds.pop();

            if (!sound) {
                sound = $(this.sourceSound).clone().get(0);
            }

            this.takenSounds.push(sound);

            return sound;
        },

        free: function (sound) {
            var index = this.takenSounds.indexOf(sound);

            if (index < 0) {
                throw new Error('Sound was free\'d but not alloc\'d!');
            }

            sound.pause();
            sound.currentTime = 0;

            this.takenSounds.splice(index, 1);
            this.freeSounds.push(sound);
        }
    };

    return SoundPool;
});
