define('game/Storyboard', [ 'game/storyboardObject', 'util/Timeline', 'util/History' ], function (storyboardObject, Timeline, History) {
    function Storyboard(objects) {
        var images = [ ];
        var videos = [ ];
        var sounds = [ ];

        var objectTimeline = new Timeline();
        var backgroundHistory = new History();

        objects.forEach(function (object) {
            if (object instanceof storyboardObject.Sprite) {
                var layer = object.layer.toLowerCase();

                var lifetime = object.getLifetime();
                objectTimeline.add(layer, object, lifetime[0], lifetime[1]);

                images.push(object.filename);
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
            var bg = this.backgroundHistory.getDataAtTime(time);
            return bg && bg.filename;
        },

        getObjectsAtTime: function (time, layer) {
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
