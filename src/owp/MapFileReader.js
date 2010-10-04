exports.$ = (function () {
    var MapFileReader = {
        read: function (data) {
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
        }
    };

    return MapFileReader;
}());
