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

    AssetManager.prototype = {
        get: function (name, type, onLoad, forceNew) {
            // TODO Clean up
            // TODO Test ...

            var assetManager = this;

            if (!forceNew) {
                if (this.onLoadHandlers.contains([ name, type ])) {
                    // Currently loading; attach callback
                    this.onLoadHandlers.get([ name, type ]).push(onLoad);

                    return undefined;
                }

                if (this.cache.contains([ name, type ])) {
                    if (typeof onLoad === 'function') {
                        onLoad(this.cache.get([ name, type ]));
                    }
                }

                return this.cache.get([ name, type ], function () {
                    assetManager.get(name, type, onLoad, true);
                });
            }

            function loaded(data) {
                var i, handlers;

                if (assetManager.onLoadHandlers.contains([ name, type ])) {
                    handlers = assetManager.onLoadHandlers.get([ name, type ]);

                    for (i = 0; i < handlers.length; ++i) {
                        handlers[i](data);
                    }

                    assetManager.onLoadHandlers.unset([ name, type ]);
                }

                assetManager.cache.set([ name, type ], data);
            }

            function attachOnLoadHandler(onLoadHandler) {
                var handlers = [ ];

                if (assetManager.onLoadHandlers.contains([ name, type ])) {
                    handlers = assetManager.onLoadHandlers.get([ name, type ]);
                } else {
                    assetManager.onLoadHandlers.set([ name, type ], handlers);
                }

                handlers.push(onLoadHandler);
            }

            if (typeof onLoad === 'function') {
                attachOnLoadHandler(onLoad);
            }

            var img;

            switch (type) {
            case 'image-set':
                // TODO Support animations
                img = document.createElement('img');
                img.src = this.root + '/' + name + '.png';

                $(img).one('load', function () {
                    loaded([ img ]);
                });

                break;

            case 'image':
                img = document.createElement('img');
                img.src = this.root + '/' + name;

                $(img).one('load', function () {
                    loaded([ img ]);
                });

                break;

            case 'audio':
                var audio = new window.Audio(this.root + '/' + name);

                $(audio).one('canplaythrough', function () {
                    loaded(audio);
                });

                break;

            case 'map':
                this.get(name + '.osu', 'asset-config', function (assetConfig) {
                    var mapInfo = MapFileReader.read(assetConfig);

                    loaded(mapInfo);
                });

                break;

            case 'asset-config':
                $.get(this.root + '/' + name, function (data) {
                    var assetConfig = AssetConfigReader.parseString(data);

                    loaded(assetConfig);
                }, 'text');

                break;
                
            case 'skin':
                var skinAssetManager = new AssetManager(this.root + '/' + name);

                this.get(name + '/skin.ini', 'asset-config', function (assetConfig) {
                    var skin = Skin.fromConfig(skinAssetManager, assetConfig);

                    loaded(skin);
                });

                break;

            default:
                throw 'Unknown asset type ' + type;
            }

            return undefined;
        }
    };

    return AssetManager;
}());
