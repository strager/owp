exports.$ = (function () {
    var Skin = function (assetManager) {
        this.assetManager = assetManager;
    };

    Skin.prototype = {
        getGraphic: function (name) {
            return this.assetManager.get(name, 'image-set');
        }
    };

    return Skin;
}());
