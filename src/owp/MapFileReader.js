exports.$ = (function () {
    var RuleSet = require('owp/RuleSet').$;
    var HitCircle = require('owp/HitCircle').$;
    var Map = require('owp/Map').$;
    var MapInfo = require('owp/MapInfo').$;

    var MapFileReader = {
        parseString: function (data) {
            function trim(string) {
                return string.replace(/^\s+|\s+$/g, '');
            }

            var ret = { };

            function section(name) {
                ret[name] = {
                    lines: [ ],
                    values: { },
                    lists: [ ]
                };

                return ret[name];
            }

            var curSection = section('global');

            var lines = data.split(/(\r|\n)+/m);
            var i, line, lineMatch;

            for (i = 0; i < lines.length; ++i) {
                line = lines[i];

                if (trim(line) === '') {
                    // Ignore blank lines
                    continue;
                }

                // [Section name]
                lineMatch = /^\[([^\]]+)\]$/.exec(line);

                if (lineMatch) {
                    curSection = section(lineMatch[1]);

                    continue;
                }

                // Key: value pair
                lineMatch = /^([^:]+):(.*)$/.exec(line);

                if (lineMatch) {
                    curSection.values[trim(lineMatch[1])] = trim(lineMatch[2]);
                }

                // Comma,separated,list
                curSection.lists.push(line.split(','));

                curSection.lines.push(line);
            }

            return ret;
        },

        // TODO better name
        read: function (data) {
            var ruleSet = RuleSet.fromSettings({
                hpDrainRate:        data.Difficulty.values.HPDrainRate,
                circleSize:         data.Difficulty.values.CircleSize,
                overallDifficulty:  data.Difficulty.values.OverallDifficulty,
                sliderMultiplier:   data.Difficulty.values.SliderMultiplier,
                sliderTickRate:     data.Difficulty.values.SliderTickRate,
                stackLeniency:      data.General.values.StackLeniency
            });

            var map = new Map(); 

            var i;

            for (i = 0; i < data.HitObjects.lists.length; ++i) {
                map.objects.push(MapFileReader.readHitObject(data.HitObjects.lists[i]));
            }

            var info = MapInfo.fromSettings(ruleSet, map, {
                audioFile:      data.General.values.AudioFilename,
                audioLeadIn:    data.General.values.AudioLeadIn,
                previewTime:    data.General.values.PreviewTime,
                countdown:      data.General.values.Countdown,
                modes:          data.General.values.Mode,

                letterBoxDuringBreaks: data.General.values.LetterboxInBreaks,

                title:      data.Metadata.values.Title,
                artist:     data.Metadata.values.Artist,
                creator:    data.Metadata.values.Creator,
                difficulty: data.Metadata.values.Version,
                source:     data.Metadata.values.Source,
                tags:       data.Metadata.values.Tags
            });

            return info;
        },

        readHitObject: function (list) {
            // TODO Slider/spinner support
            var object = new HitCircle();

            object.x = parseInt(list[0], 10);
            object.y = parseInt(list[1], 10);
            object.time = parseInt(list[2], 10);

            return object;
        }
    };

    return MapFileReader;
}());
