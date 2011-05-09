define('MapInfo', [ 'Util/util' ], function (util) {
    var MapInfo = function (ruleSet, map, storyboard) {
        this.ruleSet = ruleSet;
        this.map = map;
        this.storyboard = storyboard;
    };

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

    return MapInfo;
});
