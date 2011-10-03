/*jshint bitwise: false */
define('game/mapFile', [ 'game/RuleSet', 'game/Map', 'game/Combo', 'game/MapInfo', 'game/mapObject', 'game/Storyboard', 'game/Skin', 'game/BezierSliderCurve', 'game/CatmullSliderCurve', 'game/TimingPoint', 'game/BreakRange', 'game/storyboardObject' ], function (RuleSet, Map, Combo, MapInfo, mapObject, Storyboard, Skin, BezierSliderCurve, CatmullSliderCurve, TimingPoint, BreakRange, storyboardObject) {
    function number(str, def) {
        var f = parseFloat(str, 10);
        if (isNaN(f)) {
            return def;
        } else {
            return f;
        }
    }
    function filterFilename(str) {
        return str.replace(/^"([^"]*)"$/, '$1').replace(/\\/g, '/');
    }

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

    function readTimingPoints(assetConfig) {
        return assetConfig.TimingPoints.lists.map(function (data) {
            var isInherited = data[1] < 0;
            var flags1 = parseInt(data[3], 10);
            var options = {
                isInherited: isInherited,
                time: parseInt(data[0], 10),
                hitSoundVolume: parseInt(data[5], 10) / 100,
                sampleSet: flags1 & 2 ? 'soft' : 'normal'
            };

            if (isInherited) {
                options.bpm = -100 / number(data[1], 1);
            } else {
                options.bpm = 60 / number(data[1], 1) * 1000;
            }

            return new TimingPoint(options);
        });
    }

    function readBreakRanges(assetConfig) {
        return assetConfig.Events.lists.filter(function (data) {
            return data[0] === '2';
        }).map(function (data) {
            return new BreakRange(+data[1], +data[2]);
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
            stackLeniency:      assetConfig.General.values.StackLeniency,
            audioLeadIn:        assetConfig.General.values.AudioLeadIn,
            timingPoints:       readTimingPoints(assetConfig),
            breakRanges:        readBreakRanges(assetConfig)
        });
    }

    function readCombos(assetConfig) {
        if (!assetConfig.Colours) {
            return [
                new Combo([ 255, 128, 255 ]),
                new Combo([ 255, 128, 0   ]),
                new Combo([ 0, 128, 255   ]),
                new Combo([ 255, 255, 0   ])
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

        // Bit 1 is the hitnormal sound, which we always activate

        if (hitSoundNumber & 2) {
            hitSounds.push('hitwhistle');
        }

        if (hitSoundNumber & 4) {
            hitSounds.push('hitfinish');
        }

        if (hitSoundNumber & 8) {
            hitSounds.push('hitclap');
        }

        // normal is the default hitsound, and is always played
        hitSounds.push('hitnormal');

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

        case 'C':
            // Catmull-Rom
            return new CatmullSliderCurve(curvePoints, maxLength);

        case 'L':
            // Linear
            // Convert to Bezier by doubling intermediate points
            var bezierPoints = [ ];
            var i;

            bezierPoints.push(curvePoints[0]);
            for (i = 1; i < curvePoints.length - 1; ++i) {
                bezierPoints.push(curvePoints[i]);
                bezierPoints.push(curvePoints[i]);
            }
            bezierPoints.push(curvePoints[curvePoints.length - 1]);

            return new BezierSliderCurve(bezierPoints, maxLength);

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

        mapObject.match(object, {
            Slider: function (object) {
                var length = parseInt(list[7], 10);
                object.length = length;
                object.repeats = parseInt(list[6], 10);
                object.curve = readCurve(list[5], x, y, length);

                var extraHitSounds = list[8] ? list[8].split('|').map(function (hitSoundNumber) {
                    return readHitSounds(parseInt(hitSoundNumber, 10));
                }) : [ ];
                object.endHitSounds = [ object.hitSounds ].concat(extraHitSounds);
            },
            _: false
        });

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

    function isOfLevel(level, str) {
        var i;
        for (i = 0; i < level; ++i) {
            if (str.substr(i, 1) !== ' ') {
                return false;
            }
        }

        return str.substr(i, 1) !== ' ';
    }

    function readStoryboardCommands(data, level) {
        var commands = [ ];

        while (data.length) {
            if (!isOfLevel(level, data[0][0])) {
                break;
            }

            // TODO Remove duplicated code
            var line = data.shift();
            switch (line[0].trim()) {
            case 'F':
                var fromTime = number(line[2], 0);
                var fromValue = number(line[4], 0);
                commands.push(new storyboardObject.AlphaCommand(
                    storyboardObject.easeFunctions[line[1]],
                    fromTime,
                    number(line[3], fromTime),
                    fromValue,
                    number(line[5], fromValue)
                ));
                break;

            case 'S':
                var fromTime = number(line[2], 0);
                var fromValue = number(line[4], 0);
                commands.push(new storyboardObject.ScaleCommand(
                    storyboardObject.easeFunctions[line[1]],
                    fromTime,
                    number(line[3], fromTime),
                    fromValue,
                    number(line[5], fromValue)
                ));
                break;

            case 'M':
                var fromTime = number(line[2], 0);
                var fromX = number(line[4], 0);
                var fromY = number(line[5], 0);
                commands.push(new storyboardObject.MoveCommand(
                    storyboardObject.easeFunctions[line[1]],
                    fromTime,
                    number(line[3], fromTime),
                    [ fromX, fromY ],
                    [ number(line[6], fromX), number(line[7], fromY) ]
                ));
                break;

            case 'MX':
                var fromTime = number(line[2], 0);
                var fromValue = number(line[4], 0);
                commands.push(new storyboardObject.MoveXCommand(
                    storyboardObject.easeFunctions[line[1]],
                    fromTime,
                    number(line[3], fromTime),
                    fromValue,
                    number(line[5], fromValue)
                ));
                break;

            case 'MY':
                var fromTime = number(line[2], 0);
                var fromValue = number(line[4], 0);
                commands.push(new storyboardObject.MoveYCommand(
                    storyboardObject.easeFunctions[line[1]],
                    fromTime,
                    number(line[3], fromTime),
                    fromValue,
                    number(line[5], fromValue)
                ));
                break;

            case 'L':
                // TODO
                console.warn('Storyboard loops not supported');

                readStoryboardCommands(data, level + 1);
                break;

            // TODO More storyboard commands

            default:
                console.warn('Unknown storyboard command:', line[0].trim());
                break;
            }
        }

        return commands;
    }

    function readStoryboardSprite(data) {
        // Sprite,Background,Centre,"Storyboard\Blurry.jpg",320,240
        var defLine = data.shift();
        if (defLine.length !== 6) {
            return null;
        }

        // TODO Read alignment (data[2])
        var sprite = new storyboardObject.Sprite({
            layer: defLine[1],
            filename: filterFilename(defLine[3]),
            x: parseFloat(defLine[4], 10),
            y: parseFloat(defLine[5], 10)
        });

        var commands = readStoryboardCommands(data, 1);
        commands.forEach(sprite.addCommand.bind(sprite));

        return sprite;
    }

    function readStoryboard(assetConfig) {
        var objects = [ ];
        var data = assetConfig.Events.lists.slice();
        var line;

        while (data.length > 0) {
            var line = data[0];
            var object = null;
            switch (line[0]) {
            case '0':
                object = new storyboardObject.Background(
                    filterFilename(line[2]),
                    parseFloat(line[1], 10)
                );
                data.shift();
                break;

            case 'Video':
                object = new storyboardObject.Video(
                    filterFilename(line[2]),
                    parseFloat(line[1], 10)
                );
                data.shift();
                break;

            case 'Sprite':
                object = readStoryboardSprite(data);
                break;

            // TODO Support more storyboard object types

            default:
                // Ignore
                console.warn('Unknown storyboard object type:', line[0]);
                data.shift();
                break;
            }

            if (object) {
                objects.push(object);
            }
        }

        return new Storyboard(objects);
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
        readMap: readMap,
        readStoryboard: readStoryboard
    };
});
