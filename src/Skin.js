define('Skin', [ 'Util/util' ], function (util) {
    function Skin(assetManager) {
        this.assetManager = assetManager;
    }

    Skin.fromSettings = function (assetManager, settings) {
        var skin = new Skin(assetManager);

        var fields = (
            'name,author,' +
            'comboColors,spinnerApproachCircleColor,sliderBorderColor,' +
            'scoreFontSpacing,hitCircleFontSpacing,' +
            'sliderBallFlips,sliderBallFrames,cursorExpands'
        ).split(',');

        util.extendObjectWithFields(skin, fields, settings);

        return skin;
    };

    Skin.prototype = {
        preload: function () {
            // Try to keep this in sync with bin/skin.php
            var files = {
                'image-set': [
                    'hitcircle',
                    'approachcircle',
                    'hitcircleoverlay',
                    'cursor',
                    'cursortrail',
                    'hit0',
                    'hit50',
                    'hit100',
                    'hit100k',
                    'hit300k',
                    'hit300',
                    'sliderscorepoint',
                    'sliderpoint30',
                    'sliderpoint10',
                    'reversearrow',
                    'sliderb0',

                    'default-0',
                    'default-1',
                    'default-2',
                    'default-3',
                    'default-4',
                    'default-5',
                    'default-6',
                    'default-7',
                    'default-8',
                    'default-9',
                    'default-comma',
                    'default-dot',

                    'score-0',
                    'score-1',
                    'score-2',
                    'score-3',
                    'score-4',
                    'score-5',
                    'score-6',
                    'score-7',
                    'score-8',
                    'score-9',
                    'score-comma',
                    'score-dot',
                    'score-percent',
                    'score-x',

                    'ready-to-play'
                ],
                'sound': [
                    'normal-hitclap.wav',
                    'normal-hitfinish.wav',
                    'normal-hitnormal.wav',
                    'normal-hitwhistle.wav',
                    'normal-sliderslide.wav',
                    'normal-slidertick.wav',
                    'normal-sliderwhistle.wav',

                    'soft-hitclap.wav',
                    'soft-hitfinish.wav',
                    'soft-hitnormal.wav',
                    'soft-hitwhistle.wav',
                    'soft-sliderslide.wav',
                    'soft-slidertick.wav',

                    'spinnerbonus.wav',
                    'spinnerspin.wav',

                    'menuback.wav',
                    'menuclick.wav',
                    'menuhit.wav'
                ]
            };

            return this.assetManager.archivedPreload('skin.owpa', files);
        }
    };

    return Skin;
});
