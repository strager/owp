/*jslint bitwise: false */
exports.$ = (function () {
    var RuleSet = require('owp/RuleSet').$;
    var HitCircle = require('owp/HitCircle').$;
    var Map = require('owp/Map').$;
    var Combo = require('owp/Combo').$;
    var MapInfo = require('owp/MapInfo').$;

    var MapFileReader = {
        read: function (assetConfig) {
            var ruleSet = RuleSet.fromSettings({
                hpDrainRate:        assetConfig.Difficulty.values.HPDrainRate,
                circleSize:         assetConfig.Difficulty.values.CircleSize,
                overallDifficulty:  assetConfig.Difficulty.values.OverallDifficulty,
                sliderMultiplier:   assetConfig.Difficulty.values.SliderMultiplier,
                sliderTickRate:     assetConfig.Difficulty.values.SliderTickRate,
                stackLeniency:      assetConfig.General.values.StackLeniency
            });

            var map = new Map(); 
            var combos = [ ];

            var i;

            for (i = 1; i <= 5; ++i) {
                if (assetConfig.Colours.values.hasOwnProperty('Combo' + i)) {
                    combos.push(new Combo(assetConfig.Colours.values['Combo' + i].split(',')));
                }
            }

            var curComboIndex = 0;
            var curObjectIndex = 0;
            var curObject;

            for (i = 0; i < assetConfig.HitObjects.lists.length; ++i) {
                curObject = MapFileReader.readHitObject(assetConfig.HitObjects.lists[i]);

                if (curObject.newCombo) {
                    curComboIndex = (curComboIndex + 1) % combos.length;
                    curObjectIndex = 0;
                }

                curObject.combo = combos[curComboIndex];
                curObject.comboIndex = curObjectIndex;

                map.objects.push(curObject);

                ++curObjectIndex;
            }

            var info = MapInfo.fromSettings(ruleSet, map, {
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

            return info;
        },

        readHitObject: function (list) {
            // TODO Slider/spinner support
            var object = new HitCircle();

            object.x = parseInt(list[0], 10);
            object.y = parseInt(list[1], 10);
            object.time = parseInt(list[2], 10);

            var flags1 = parseInt(list[3], 10);

            object.newCombo = !!(flags1 & 4);

            return object;
        }
    };

    return MapFileReader;
}());
