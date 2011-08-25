define('MapInfo', [ 'Util/util', 'mapObject' ], function (util, mapObject) {
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
        var allObjects = [ ];

        this.map.objects.forEach(function (object) {
            object = mapObject.proto(object);

            mapObject.match(object, {
                Slider: function () {
                    var ticks = this.ruleSet.getSliderTicks(object);
                    object.ticks = ticks;
                    allObjects.push.apply(allObjects, ticks);

                    var ends = this.ruleSet.getSliderEnds(object);
                    object.ends = ends;
                    allObjects.push.apply(allObjects, ends);
                }
            }, this);

            allObjects.push(object);
        }, this);

        // TODO Apply note stacking

        return allObjects;
    };

    return MapInfo;
});
