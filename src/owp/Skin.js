exports.$ = (function () {
    var Skin = function (path) {
        this.path = path;
        this.cache = {
            graphics: { },
            sound: { }
        };
    };

    Skin.prototype = {
        getGraphic: function (name) {
            if (this.cache.graphics[name]) {
                return this.cache.graphics[name];
            }

            // TODO Support animations (especially slider ball and follow
            // circle)

            var img = document.createElement('img');
            img.src = this.path + '/' + name + '.png';

            this.cache.graphics[name] = [ img ];

            return this.cache.graphics[name];
        }
    };

    return Skin;
}());
