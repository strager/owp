define('Soundboard', [ 'jQuery', 'Util/Timeline' ], function ($, Timeline) {
    var PLAY_SOUND = { }; // => soundName

    var Soundboard = function (assetManager) {
        this.timeline = new Timeline();
        this.assetManager = assetManager;
    };

    Soundboard.prototype = {
        playSoundAt: function (soundName, time) {
            this.timeline.add(PLAY_SOUND, soundName, time);
        },
        update: function (time) {
            var soundNames = this.timeline.getAllInTimeRange(0, time, PLAY_SOUND);

            this.timeline.removeMany(PLAY_SOUND, soundNames);

            var assetManager = this.assetManager;

            var soundElements = soundNames.map(function (soundName) {
                return assetManager.get(soundName, 'audio');
            });

            soundElements.forEach(function (soundElement) {
                $(soundElement).clone().get(0).play();
            });
        }
    };

    return Soundboard;
});
