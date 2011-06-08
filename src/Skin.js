define('Skin', [ 'Util/util' ], function (util) {
    var Skin = function (assetManager) {
        this.assetManager = assetManager;
    };

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
                    'hit0',
                    'hit50',
                    'hit100',
                    'hit100k',
                    'hit300k',
                    'hit300',
                    'sliderb0'
                ]
            };

            var i;

            for (i = 0; i < 10; ++i) {
                files['image-set'].push('default-' + i);
            }

            return this.assetManager.preload(files);
        }
    };

    return Skin;
});
