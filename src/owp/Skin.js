exports.$ = (function () {
    var Skin = function (assetManager) {
        this.assetManager = assetManager;
    };

    Skin.fromConfig = function (assetManager, assetConfig) {
        return Skin.fromSettings(assetManager, {
            name:   assetConfig.General.values.Name,
            author: assetConfig.General.values.Author,

            comboColors:                [ ],   // TODO
            spinnerApproachCircleColor: assetConfig.Colours.values.SpinnerApproachCircle.split(','),
            sliderBorderColor:          assetConfig.Colours.values.SliderBorder.split(','),

            scoreFontSpacing:     -assetConfig.Fonts.values.ScoreOverlap,
            hitCircleFontSpacing: -assetConfig.Fonts.values.HitCircleOverlap,

            sliderBallFlips:  assetConfig.General.values.SliderBallFlip,
            sliderBallFrames: assetConfig.General.values.SliderBallFrames,
            cursorExpands:    assetConfig.General.values.CursorExpand
        });
    };

    Skin.fromSettings = function (assetManager, settings) {
        var skin = new Skin(assetManager);

        var fields = (
            'name,author,' +
            'comboColors,spinnerApproachCircleColor,sliderBorderColor,' +
            'scoreFontSpacing,hitCircleFontSpacing,' +
            'sliderBallFlips,sliderBallFrames,cursorExpands'
        ).split(',');

        var i, key;

        for (i = 0; i < fields.length; ++i) {
            key = fields[i];

            skin[key] = settings && settings.hasOwnProperty(key) ? settings[key] : undefined;
        }

        return skin;
    };
    Skin.prototype = {
        getGraphic: function (name, onLoad) {
            return this.assetManager.get(name, 'image-set', onLoad);
        }
    };

    return Skin;
}());
