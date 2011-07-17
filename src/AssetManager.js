/*global window: false */
define('AssetManager', [ 'jQuery', 'MapInfo', 'mapFile', 'assetConfig', 'Util/Map', 'Util/Cache', 'q' ], function ($, MapInfo, mapFile, assetConfig, Map, Cache, Q) {
    function setAudioSourceType(source) {
        // Safari hates it when you put .wav here, and Midori throws up when
        // you put .ogg here.  Guess this method isn't as useful as I thought
        // it'd be...  =[
        var types = {
            //'application/ogg': /\.ogg$/i,
            //'audio/x-wav': /\.wav$/i,
            'audio/mpeg': /\.mp3$/i
        };

        Object.keys(types).forEach(function (mimeType) {
            if (types[mimeType].test(source.src)) {
                source.type = mimeType;
            }
        });
    }

    function AssetManager(root) {
        this.root = root;
        this.cache = new Cache();
    }

    AssetManager.typeHandlers = {
        'image-set': function (assetManager, name) {
            // TODO Support animations
            return Q.when(assetManager.load(name + '.png', 'image'), function (image) {
                return [ image ];
            });
        },

        image: function (assetManager, name) {
            var ret = Q.defer();

            var img = document.createElement('img');
            img.src = assetManager.root + '/' + name;

            $(img).one('load', function () {
                ret.resolve(img);
            });

            return ret.promise;
        },

        audio: function (assetManager, name) {
            var ret = Q.defer();

            var audio = new window.Audio();
            audio.autobuffer = true;
            audio.preload = 'auto';

            var $audio = $(audio);

            function fail(event) {
                if (audio.networkState === audio.NETWORK_NO_SOURCE) {
                    ret.reject(new Error('NETWORK_NO_SOURCE'));
                }
            }

            var originalTrack = document.createElement('source');
            originalTrack.src = assetManager.root + '/' + name;
            setAudioSourceType(originalTrack);
            $(originalTrack).one('error', fail).appendTo($audio);

            var vorbisTrack = document.createElement('source');
            vorbisTrack.src = assetManager.root + '/' + name + '.ogg';
            setAudioSourceType(vorbisTrack);
            $(vorbisTrack).one('error', fail).appendTo($audio);

            $audio
                .one('canplaythrough', function () {
                    ret.resolve(audio);
                })
                .one('error', function (event) {
                    ret.reject(new Error());
                });

            audio.load();

            return ret.promise;
        },

        sound: function (assetManager, name) {
            return AssetManager.typeHandlers.audio(assetManager, name);
        },

        map: function (assetManager, name) {
            return Q.ref(assetManager.load(name + '.osu', 'asset-config'))
                .then(function (assetConfig) {
                    var mapInfo = mapFile.readMap(assetConfig);

                    return mapInfo;
                });
        },

        'asset-config': function (assetManager, name) {
            var ret = Q.defer();

            $.get(assetManager.root + '/' + name, function (data) {
                var config = assetConfig.parseString(data);

                ret.resolve(config);
            }, 'text');

            return ret.promise;
        },

        skin: function (assetManager, name, loaded) {
            var skinAssetManager = new AssetManager(assetManager.root + '/' + name);

            return Q.ref(assetManager.load(name + '/skin.ini', 'asset-config'))
                .then(function (assetConfig) {
                    var skin = mapFile.readSkin(assetConfig, skinAssetManager);

                    return skin;
                });
        }
    };

    AssetManager.prototype = {
        loadUncached: function (name, type) {
            var assetManager = this;

            if (!AssetManager.typeHandlers.hasOwnProperty(type)) {
                throw 'Unknown asset type: ' + type;
            }

            return AssetManager.typeHandlers[type](this, name);
        },

        load: function (name, type) {
            var assetManager = this;

            return this.cache.get([ name, type ], function () {
                return assetManager.loadUncached(name, type);
            });
        },

        get: function (name, type) {
            var data = this.load(name, type);

            if (!Q.isResolved(data)) {
                throw new Error('Data could not be loaded: ' + name);
            }

            return data.valueOf();
        },

        preload: function (obj) {
            var assetManager = this;

            var assets = [ ];

            Object.keys(obj).forEach(function (type) {
                obj[type].forEach(function (name) {
                    var asset = assetManager.load(name, type);

                    assets.push(asset);
                });
            });

            return Q.all(assets);
        }
    };

    return AssetManager;
});
