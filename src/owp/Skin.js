exports.$ = (function () {
    var Skin = function (assetManager) {
        this.assetManager = assetManager;
    };

    Skin.prototype = {
        getGraphic: function (name, onLoad) {
            return this.assetManager.get(name, 'image-set', onLoad);
        }
    };

    return Skin;
}());
