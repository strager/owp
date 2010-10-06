/*global window: false */
exports.$ = (function () {
    var $ = require('vendor/jquery').$;
    var MapInfo = require('owp/MapInfo').$;
    var MapFileReader = require('owp/MapFileReader').$;
    var AssetConfigReader = require('owp/AssetConfigReader').$;
    var Skin = require('owp/Skin').$;
    var Map = require('owp/Util/Map').$;
    var Cache = require('owp/Util/Cache').$;

    var AssetManager = function (root) {
        this.root = root;
        this.cache = new Cache();
        this.onLoadHandlers = new Map();
    };

    AssetManager.typeHandlers = {
        'image-set': function (assetManager, name, loaded) {
            // TODO Support animations
            assetManager.get(name + '.png', 'image', function (data) {
                loaded([ data ]);
            });
        },

        image: function (assetManager, name, loaded) {
            var img = document.createElement('img');
            img.src = assetManager.root + '/' + name;

            $(img).one('load', function () {
                loaded(img);
            });
        },

        audio: function (assetManager, name, loaded) {
            var audio = new window.Audio(assetManager.root + '/' + name);

            $(audio).one('canplaythrough', function () {
                loaded(audio);
            });
        },

        map: function (assetManager, name, loaded) {
            assetManager.get(name + '.osu', 'asset-config', function (assetConfig) {
                var mapInfo = MapFileReader.read(assetConfig);

                loaded(mapInfo);
            });
        },

        'asset-config': function (assetManager, name, loaded) {
            $.get(assetManager.root + '/' + name, function (data) {
                var assetConfig = AssetConfigReader.parseString(data);

                loaded(assetConfig);
            }, 'text');
        },

        skin: function (assetManager, name, loaded) {
            var skinAssetManager = new AssetManager(assetManager.root + '/' + name);

            assetManager.get(name + '/skin.ini', 'asset-config', function (assetConfig) {
                var skin = Skin.fromConfig(skinAssetManager, assetConfig);

                loaded(skin);
            });
        }
    };

    AssetManager.prototype = {
        assetLoaded: function (name, type, data) {
            var key = [ name, type ];
            var i, handlers;

            if (this.onLoadHandlers.contains(key)) {
                handlers = this.onLoadHandlers.get(key);

                for (i = 0; i < handlers.length; ++i) {
                    if (typeof handlers[i] !== 'function') {
                        continue;
                    }

                    handlers[i](data);
                }

                this.onLoadHandlers.unset(key);
            }

            this.cache.set(key, data);
        },

        onLoad: function (name, type, onLoadHandler) {
            var key = [ name, type ];
            var handlers = [ ];

            if (this.onLoadHandlers.contains(key)) {
                handlers = this.onLoadHandlers.get(key);
            } else {
                this.onLoadHandlers.set(key, handlers);
            }

            handlers.push(onLoadHandler);
        },

        forceGet: function (name, type, onLoadHandler) {
            var assetManager = this;

            this.onLoad(name, type, onLoadHandler);

            if (!AssetManager.typeHandlers.hasOwnProperty(type)) {
                throw 'Unknown asset type ' + type;
            }

            return AssetManager.typeHandlers[type](this, name, function (data) {
                assetManager.assetLoaded(name, type, data);
            });
        },

        get: function (name, type, onLoadHandler) {
            var assetManager = this;

            if (this.onLoadHandlers.contains([ name, type ])) {
                // Currently loading; attach callback
                this.onLoad(name, type, onLoadHandler);

                return undefined;
            }

            if (this.cache.contains([ name, type ])) {
                if (typeof onLoadHandler === 'function') {
                    onLoadHandler(this.cache.get([ name, type ]));
                }
            }

            return this.cache.get([ name, type ], function () {
                assetManager.forceGet(name, type, onLoadHandler);
            });
        }
    };

    return AssetManager;
}());
