/*global window: false */
exports.$ = (function () {
    var $ = require('vendor/jquery').$;
    var MapInfo = require('owp/MapInfo').$;
    var MapFileReader = require('owp/MapFileReader').$;
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

            switch (type) {
            case 'image-set':
                // TODO Support animations
                var img = document.createElement('img');
                img.src = this.root + '/' + name + '.png';

                $(img).bind('load', function () {
                    loaded([ img ]);
                });

                break;

            case 'audio':
                var audio = new window.Audio(this.root + '/' + name);

                $(audio).bind('canplaythrough', function () {
                    loaded(audio);
                });

                break;

            case 'map':
                $.get(this.root + '/' + name + '.osu', function (data) {
                    var mapInfo = MapFileReader.read(MapFileReader.parseString(data));

                    loaded(mapInfo);
                }, 'text');

                break;

            default:
                throw 'Unknown asset type ' + type;
            }

            return undefined;
        }
    };

    return AssetManager;
}());
