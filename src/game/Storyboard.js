define('game/Storyboard', [ ], function () {
    function Storyboard() {
        this.sounds = [ ];
        this.backgrounds = [ ];
        this.videos = [ ];
        this.images = [ ];
    }

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
        },

        preload: function (assetManager) {
            var files = {
                'image': this.backgrounds.map(function (background) {
                    return background.fileName;
                }),

                'video': this.videos.map(function (video) {
                    return video.fileName;
                })
            };

            return assetManager.preload(files);
        }
    };

    return Storyboard;
});
