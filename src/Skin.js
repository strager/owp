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

                    'default-comma',
                    'default-dot',

                    'score-comma',
                    'score-dot',
                    'score-percent',
                    'score-x'
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

            var i;

            for (i = 0; i < 10; ++i) {
                files['image-set'].push('default-' + i);
                files['image-set'].push('score-' + i);
            }

            return this.assetManager.preload(files);
        }
    };

    return Skin;
});
