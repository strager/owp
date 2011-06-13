define('Soundboard', [ 'jQuery', 'Util/Timeline' ], function ($, Timeline) {
    var PLAY_SOUND = 'play sound'; // => soundName

    var Soundboard = function (assetManager, timeline) {
        this.timeline = timeline;
        this.assetManager = assetManager;

        var playSoundNow = function (soundName) {
            var soundElement = assetManager.get(soundName, 'audio');

            $(soundElement).clone().get(0).play();
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
