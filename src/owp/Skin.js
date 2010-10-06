exports.$ = (function () {
    var util = require('owp/Util/util');

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
        getGraphic: function (name, onLoad) {
            return this.assetManager.get(name, 'image-set', onLoad);
        }
    };

    return Skin;
}());
