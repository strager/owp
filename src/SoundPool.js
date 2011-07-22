define('SoundPool', [ ], function () {
    function SoundPool(sound) {
        this.sourceSound = sound;
        this.freeSounds = [ ];
        this.takenSounds = [ ];
    }

    SoundPool.prototype = {
        prealloc: function (count) {
            var alloced = [ ];
            var i;

            for (i = 0; i < count; ++i) {
                alloced.push(this.alloc());
            }

            alloced.forEach(this.free, this);
        },

        alloc: function () {
            var sound = this.freeSounds.pop();

            if (!sound) {
                sound = this.sourceSound.cloneNode(true);
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

            this.takenSounds.splice(index, 1);
            this.freeSounds.push(sound);
        }
    };

    return SoundPool;
});
