exports.$ = (function () {
    var MapInfo = function (ruleSet, map, data) {
        this.ruleSet = ruleSet;
        this.map = map;

        var fields = (
            'audioFile,audioLeadIn,previewTime,countdown,modes,' +
            'letterBoxDuringBreaks,' +
            'title,artist,creator,difficulty,source,tags'
        ).split(',');

        var i, key;

        for (i = 0; i < fields.length; ++i) {
            key = fields[i];

            this[key] = data && data.hasOwnProperty(key) ? data[key] : null;
        }
    };

    return MapInfo;
}());
