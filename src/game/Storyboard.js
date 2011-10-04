define('game/Storyboard', [ 'game/storyboardObject', 'util/Timeline', 'util/History' ], function (storyboardObject, Timeline, History) {
    var ENABLE_STORYBOARDS = false;

    function Storyboard(objects) {
        var images = [ ];
        var videos = [ ];
        var sounds = [ ];

        var objectTimeline = new Timeline();
        var backgroundHistory = new History();

        objects.forEach(function (object) {
            if (ENABLE_STORYBOARDS) {
                if (object instanceof storyboardObject.Sprite) {
                    var layer = object.layer.toLowerCase();

                    var lifetime = object.getLifetime();
                    objectTimeline.add(layer, object, lifetime[0], lifetime[1]);

                    images.push(object.filename);
                }
            }

            if (object instanceof storyboardObject.Background) {
                backgroundHistory.add(object.time, object);

                images.push(object.filename);
            }
            
            if (object instanceof storyboardObject.Video) {
                videos.push(object.filename);
            }
        });

        this.assetFilenames = {
            'image': images,
            //'video': videos,
            'sound': sounds
        };

        this.objects = objects.slice();

        this.objectTimeline = objectTimeline;
        this.backgroundHistory = backgroundHistory;
    }

    Storyboard.prototype = {
        getBackgroundFilename: function (time) {
            var bg = this.backgroundHistory.getDataAtTime(time) || this.backgroundHistory.getFirst(null);
            return bg && bg.filename;
        },

        getObjectsAtTime: function (time, layer) {
            if (!ENABLE_STORYBOARDS) {
                return [ ];
            }

            var objects = this.objectTimeline.getAllAtTime(time, layer);
            return objects.map(function (object) {
                return object.getAtTime(time);
            });
        },

        preload: function (assetManager) {
            return assetManager.preload(this.assetFilenames);
        }
    };

    Storyboard.BACKGROUND_LAYER = 'background';
    Storyboard.FOREGROUND_LAYER = 'foreground';

    return Storyboard;
});
