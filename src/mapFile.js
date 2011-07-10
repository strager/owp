/*jshint bitwise: false */
define('mapFile', [ 'RuleSet', 'Map', 'Combo', 'MapInfo', 'mapObject', 'Storyboard', 'Skin', 'BezierSliderCurve' ], function (RuleSet, Map, Combo, MapInfo, mapObject, Storyboard, Skin, BezierSliderCurve) {
    function readSkin(assetConfig, assetManager) {
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
    }

    function readRuleSet(assetConfig) {
        return RuleSet.fromSettings({
            hpDrainRate:        assetConfig.Difficulty.values.HPDrainRate,
            circleSize:         assetConfig.Difficulty.values.CircleSize,
            overallDifficulty:  assetConfig.Difficulty.values.OverallDifficulty,
            approachRate:       assetConfig.Difficulty.values.ApproachRate,
            sliderMultiplier:   assetConfig.Difficulty.values.SliderMultiplier,
            sliderTickRate:     assetConfig.Difficulty.values.SliderTickRate,
            stackLeniency:      assetConfig.General.values.StackLeniency
        });
    }

    function readCombos(assetConfig) {
        if (!assetConfig.Colours) {
            return [
                new Combo([ 255,128,255 ]),
                new Combo([ 255,128,0   ]),
                new Combo([ 0,128,255   ]),
                new Combo([ 255,255,0   ])
            ];
        }

        var combos = [ ];

        var i;

        for (i = 1; i <= 5; ++i) {
            if (assetConfig.Colours.values.hasOwnProperty('Combo' + i)) {
                combos.push(new Combo(assetConfig.Colours.values['Combo' + i].split(',')));
            }
        }

        return combos;
    }

    function readHitSounds(hitSoundNumber) {
        var hitSounds = [ ];

        // FIXME No clue if these are correct

        if (hitSoundNumber & 1) {
            hitSounds.push('hitnormal');
        }

        if (hitSoundNumber & 2) {
            hitSounds.push('hitwhistle');
        }

        if (hitSoundNumber & 4) {
            hitSounds.push('hitfinish');
        }

        if (hitSoundNumber & 8) {
            hitSounds.push('hitclap');
        }

        if (hitSounds.length === 0) {
            // normal is the default hitsound,
            // in case none is specified
            hitSounds.push('hitnormal');
        }

        return hitSounds;
    }

    function readCurve(curveString, x, y, maxLength) {
        var parts = curveString.split('|');
        var curveType = parts.shift();
        var curvePoints = parts.map(function (pointString) {
            return pointString.split(':').map(function (coord) {
                return parseInt(coord, 10);
            });
        });

        curvePoints.unshift([ x, y ]);

        switch (curveType) {
        case 'B':
            // Bezier
            return new BezierSliderCurve(curvePoints, maxLength);

        default:
            throw new Error('Unknown slider type: ' + curveType);
        }
    }

    function readHitObject(list) {
        var flags1 = parseInt(list[3], 10);

        var x = parseInt(list[0], 10);
        var y = parseInt(list[1], 10);

        var object;

        switch (flags1 & 0x03) {
        case 1:
            // Hit circle
            object = new mapObject.HitCircle();

            break;

        case 2:
            // Slider
            object = new mapObject.Slider();

            object.length = parseInt(list[7], 10);
            object.repeats = parseInt(list[6], 10);
            object.curve = readCurve(list[5], x, y, object.length);

            break;

        // TODO Spinner support

        default:
            return null;
        }

        object.x = x;
        object.y = y;
        object.time = parseInt(list[2], 10);

        object.newCombo = !!(flags1 & 4);

        object.hitSounds = readHitSounds(parseInt(list[4], 10));

        return object;
    }

    function readHitObjects(assetConfig, combos) {
        var objects = [ ];

        var curComboIndex = 0;
        var curObjectIndex = 0;
        var curObject;
        var i;

        for (i = 0; i < assetConfig.HitObjects.lists.length; ++i) {
            curObject = readHitObject(assetConfig.HitObjects.lists[i]);

            if (!curObject) {
                continue;
            }

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
    }

    function readMapInfo(assetConfig, ruleSet, map, storyboard) {
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
    }

    function readStoryboard(assetConfig) {
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
    }

    function readMap(assetConfig) {
        var ruleSet = readRuleSet(assetConfig);

        var combos = readCombos(assetConfig);

        var map = new Map();
        map.objects = readHitObjects(assetConfig, combos);

        var storyboard = readStoryboard(assetConfig);

        var info = readMapInfo(assetConfig, ruleSet, map, storyboard);

        return info;
    }

    return {
        readSkin: readSkin,
        readMap: readMap
    };
});
