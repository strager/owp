/*global window: false */
exports.$ = (function () {
    var $ = require('vendor/jquery').$;
    var MapInfo = require('owp/MapInfo').$;
    var MapFileReader = require('owp/MapFileReader').$;

    var AssetManager = function (root) {
        this.root = root;
        this.cache = { };
        this.loadingCache = { };
    };

    AssetManager.prototype = {
        get: function (name, type, onLoad, forceNew) {
            // TODO Clean up

            if (!forceNew) {
                if (this.loadingCache[type] && this.loadingCache[type][name]) {
                    // Currently loading; attach callback
                    this.loadingCache[type][name].push(onLoad);

                    return undefined;
                }

                if (this.cache[type] && this.cache[type][name]) {
                    // Loaded; call callback immediately
                    if (typeof onLoad === 'function') {
                        onLoad(this.cache[type][name]);
                    }

                    return this.cache[type][name];
                }
            }

            var assetManager = this;

            function loaded(data) {
                var i, handlers;

                if (assetManager.loadingCache[type] && assetManager.loadingCache[type][name]) {
                    handlers = assetManager.loadingCache[type][name];

                    for (i = 0; i < handlers.length; ++i) {
                        handlers[i](data);
                    }

                    delete assetManager.loadingCache[type][name];
                }

                if (!assetManager.cache[type]) {
                    assetManager.cache[type] = { };
                }

                assetManager.cache[type][name] = data;
            }

            function attachOnLoadHandler(onLoadHandler) {
                if (!assetManager.loadingCache[type]) {
                    assetManager.loadingCache[type] = { };
                }

                if (!assetManager.loadingCache[type][name]) {
                    assetManager.loadingCache[type][name] = [ ];
                }

                assetManager.loadingCache[type][name].push(onLoadHandler);
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
