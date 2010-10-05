exports.$ = (function () {
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

        var i, key;

        for (i = 0; i < fields.length; ++i) {
            key = fields[i];

            mapInfo[key] = settings && settings.hasOwnProperty(key) ? settings[key] : undefined;
        }

        return mapInfo;
    };

    return MapInfo;
}());
