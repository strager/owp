exports.$ = (function () {
    var Storyboard = function () {
        this.sounds = [ ];
        this.backgrounds = [ ];
        this.images = [ ];
    };

    Storyboard.fromData = function (data) {
        var storyboard = new Storyboard();

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

            default:
                // Ignore
                break;

            case NaN:
                // Ignore
                break;
            }
        }

        return storyboard;
    };

    Storyboard.prototype = {
        getBackground: function (time) {
            var i, background = null;

            for (i = 0; i < this.backgrounds.length; ++i) {
                if (this.backgrounds[i].time <= time) {
                    if (background === null || this.backgrounds[i].time < background.time) {
                        background = this.backgrounds[i];
                    }
                }
            }

            return background;
        }
    };

    return Storyboard;
}());
