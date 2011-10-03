define('game/CompoundStoryboard', [ 'q' ], function (Q) {
    function CompoundStoryboard(storyboards) {
        this.storyboards = storyboards.slice();
    }

    CompoundStoryboard.prototype = {
        getBackgroundFilename: function (time) {
            // FIXME Not accurate
            var i;
            for (i = 0; i < this.storyboards.length; ++i) {
                var bg = this.storyboards[i].getBackgroundFilename(time);
                if (bg) {
                    return bg;
                }
            }

            return null;
        },

        getObjectsAtTime: function (time, layer) {
            return this.storyboards.reduce(function (acc, storyboard) {
                return acc.concat(storyboard.getObjectsAtTime(time, layer));
            }, [ ]);
        },

        preload: function (assetManager) {
            var promises = this.storyboards.map(function (sb) {
                return sb.preload(assetManager);
            });
            return Q.all(promises);
        }
    };

    return CompoundStoryboard;
});
