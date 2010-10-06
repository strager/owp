exports.$ = (function () {
    var Storyboard = function () {
        this.sounds = [ ];
        this.backgrounds = [ ];
        this.images = [ ];
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
