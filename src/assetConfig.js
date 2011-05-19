define('assetConfig', [ ], function () {
    return {
        parseString: function (data) {
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

                if (line.trim() === '') {
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
                    curSection.values[lineMatch[1].trim()] = lineMatch[2].trim();
                }

                // Comma,separated,list
                curSection.lists.push(line.split(','));

                curSection.lines.push(line);
            }

            return ret;
        }
    };
});
