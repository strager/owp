/*jslint bitwise: false */
/*jshint bitwise: false */
define('mapFile', [ 'RuleSet', 'HitCircle', 'Map', 'Combo', 'MapInfo', 'Storyboard', 'Skin' ], function (RuleSet, HitCircle, Map, Combo, MapInfo, Storyboard, Skin) {
    var readSkin = function (assetConfig, assetManager) {
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

    var readRuleSet = function (assetConfig) {
        return RuleSet.fromSettings({
            hpDrainRate:        assetConfig.Difficulty.values.HPDrainRate,
            circleSize:         assetConfig.Difficulty.values.CircleSize,
            overallDifficulty:  assetConfig.Difficulty.values.OverallDifficulty,
            approachRate:       assetConfig.Difficulty.values.ApproachRate,
            sliderMultiplier:   assetConfig.Difficulty.values.SliderMultiplier,
            sliderTickRate:     assetConfig.Difficulty.values.SliderTickRate,
            stackLeniency:      assetConfig.General.values.StackLeniency
        });
    };

    var readCombos = function (assetConfig) {
        var combos = [ ];

        var i;

        for (i = 1; i <= 5; ++i) {
            if (assetConfig.Colours.values.hasOwnProperty('Combo' + i)) {
                combos.push(new Combo(assetConfig.Colours.values['Combo' + i].split(',')));
            }
        }

        return combos;
    };

    var readHitObject = function (list) {
        // TODO Slider/spinner support
        var object = new HitCircle();

        object.x = parseInt(list[0], 10);
        object.y = parseInt(list[1], 10);
        object.time = parseInt(list[2], 10);

        var flags1 = parseInt(list[3], 10);

        object.newCombo = !!(flags1 & 4);

        return object;
    };

    var readHitObjects = function (assetConfig, combos) {
        var objects = [ ];

        var curComboIndex = 0;
        var curObjectIndex = 0;
        var curObject;
        var i;

        for (i = 0; i < assetConfig.HitObjects.lists.length; ++i) {
            curObject = readHitObject(assetConfig.HitObjects.lists[i]);

            if (curObject.newCombo) {
                curComboIndex = (curComboIndex + 1) % combos.length;
                curObjectIndex = 0;
            }

            curObject.combo = combos[curComboIndex];
            curObject.comboIndex = curObjectIndex;

            objects.push(curObject);

            ++curObjectIndex;
        }

        return objects;
    };

    var readMapInfo = function (assetConfig, ruleSet, map, storyboard) {
        return MapInfo.fromSettings(ruleSet, map, storyboard, {
            audioFile:      assetConfig.General.values.AudioFilename,
            audioLeadIn:    assetConfig.General.values.AudioLeadIn,
            previewTime:    assetConfig.General.values.PreviewTime,
            countdown:      assetConfig.General.values.Countdown,
            modes:          assetConfig.General.values.Mode,

            letterBoxDuringBreaks: assetConfig.General.values.LetterboxInBreaks,

            title:      assetConfig.Metadata.values.Title,
            artist:     assetConfig.Metadata.values.Artist,
            creator:    assetConfig.Metadata.values.Creator,
            difficulty: assetConfig.Metadata.values.Version,
            source:     assetConfig.Metadata.values.Source,
            tags:       assetConfig.Metadata.values.Tags
        });
    };

    var readStoryboard = function (assetConfig) {
        var storyboard = new Storyboard();

        var data = assetConfig.Events.lists;
        var i, line;

        for (i = 0; i < data.length; ++i) {
            line = data[i];

            switch (parseInt(line[0], 10)) {
            case 0:
                storyboard.backgrounds.push({
                    time: parseInt(line[1], 10),
                    fileName: line[2].replace(/^"([^"]*)"$/, '$1')
                });

                break;

                // TODO Support more storyboard command types

            default:
                // Ignore
                break;

            case NaN:
                // Ignore
                break;
            }
        }

        return storyboard;
    };

    var readMap = function (assetConfig) {
        var ruleSet = readRuleSet(assetConfig);

        var combos = readCombos(assetConfig);

        var map = new Map(); 
        map.objects = readHitObjects(assetConfig, combos);

        var storyboard = readStoryboard(assetConfig);

        var info = readMapInfo(assetConfig, ruleSet, map, storyboard);

        return info;
    };

    return {
        readSkin: readSkin,
        readMap: readMap
    };
});
