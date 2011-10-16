define('game/MapInfo', [ 'util/util', 'game/mapObject' ], function (util, mapObject) {
    function MapInfo(ruleSet, map, storyboard) {
        this.ruleSet = ruleSet;
        this.map = map;
        this.storyboard = storyboard;
    }

    MapInfo.fromSettings = function (ruleSet, map, storyboard, settings) {
        var mapInfo = new MapInfo(ruleSet, map, storyboard);

        var fields = (
            'audioFile,audioLeadIn,previewTime,countdown,modes,' +
            'letterBoxDuringBreaks,' +
            'title,artist,creator,difficulty,source,tags'
        ).split(',');

        util.extendObjectWithFields(mapInfo, fields, settings);

        return mapInfo;
    };

    MapInfo.prototype.getAllObjects = function () {
        var objects = this.map.objects.map(mapObject.proto);

        // Apply note stacking *before* generating ticks, ends, etc.
        this.ruleSet.applyNoteStacking(objects);

        objects = objects.reduce(function (acc, object) {
            return mapObject.match(object, {
                Slider: function () {
                    // Cache flattened slider
                    // (functions should be memoized)
                    object.curve.flattenCentrePoints();
                    object.curve.flattenContourPoints(this.ruleSet.getSliderTrackWidth());
                    this.ruleSet.getObjectBoundingRectangle(object);

                    // Slider ticks and ends
                    var ticks = this.ruleSet.getSliderTicks(object);
                    object.ticks = ticks;

                    var ends = this.ruleSet.getSliderEnds(object);
                    object.ends = ends;

                    return acc.concat([ object ]).concat(ticks).concat(ends);
                },
                _: acc.concat([ object ])
            }, this);
        }.bind(this), [ ]);

        return objects;
    };

    return MapInfo;
});
