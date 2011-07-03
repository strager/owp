define('Soundboard', [ 'jQuery', 'Util/Timeline', 'SoundPool' ], function ($, Timeline, SoundPool) {
    var PLAY_SOUND = 'play sound'; // => soundName

    var Soundboard = function (assetManager, timeline) {
        this.timeline = timeline;
        this.assetManager = assetManager;

        var soundPools = { };

        var getSoundPool = function (soundName) {
            if (!Object.prototype.hasOwnProperty.call(soundPools, soundName)) {
                soundPools[soundName] = new SoundPool(assetManager.get(soundName, 'sound'));
            }

            return soundPools[soundName];
        };

        var playSoundNow = function (soundName) {
            var soundPool = getSoundPool(soundName);

            var sound = soundPool.alloc();
            $(sound).one('ended', function () {
                soundPool.free(sound);
            });
            sound.play();
        };

        this.timeline.subscribe(PLAY_SOUND, 'enter', function (soundName) {
            playSoundNow(soundName);
        });
    };

    Soundboard.prototype = {
        playSoundAt: function (soundName, time) {
            this.timeline.add(PLAY_SOUND, soundName, time);
        }
    };

    return Soundboard;
});
