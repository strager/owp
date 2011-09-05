/*global window: false */
define('AssetManager', [ 'game/MapInfo', 'game/mapFile', 'assetConfig', 'util/Map', 'util/Cache', 'q' ], function (MapInfo, mapFile, assetConfig, Map, Cache, Q) {
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

    var audioLoadCounter = 0;

    function randomGlobal() {
        ++audioLoadCounter;
        return 'owp_global__do_not_touch__bug_workaround_' + audioLoadCounter;
    }

    var goodResponseCodes = [ 200, 204, 206, 301, 302, 303, 304, 307 ];

    function xhr(url) {
        var ret = Q.defer();

        var xhr = new XMLHttpRequest();
        xhr.onerror = function () {
            // FIXME is this needed?
            ret.reject(new Error());
        };
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { // Done loading
                if (goodResponseCodes.indexOf(xhr.status) >= 0) {
                    // OK
                    ret.resolve(xhr);
                } else {
                    ret.reject(new Error(xhr.status));
                }
            }
        };

        xhr.open('GET', url, true);
        xhr.send(null);

        return ret.promise;
    }

    function AssetManager(root) {
        this.root = root;
        this.cache = new Cache();
    }

    AssetManager.typeHandlers = {
        image: function (assetManager, name) {
            var ret = Q.defer();

            var img = new Image();
            img.addEventListener('load', function () {
                ret.resolve(img);

                img.onload = null;
                img = null;
            }, false);
            img.addEventListener('error', function () {
                ret.reject(new Error());
            }, false);

            // We need to attach the onload event first for IE
            img.src = assetManager.root + '/' + name;

            return ret.promise;
        },

        'archive': function (assetManager, name) {
            var ret = Q.defer();

            function loadSheet(sheetDefinition) {
                return Q.when(assetManager.load(sheetDefinition.file, 'image'), function (sheetImage) {
                    sheetDefinition.images.forEach(function (imageDefinition) {
                        var width = imageDefinition.dest[2];
                        var height = imageDefinition.dest[3];

                        var canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;

                        var context = canvas.getContext('2d');
                        context.globalCompositeOperation = 'copy';
                        context.fillStyle = 'transparent';
                        context.clearRect(0, 0, width, height);
                        context.fillRect(0, 0, width, height);

                        context.drawImage(
                            sheetImage,

                            imageDefinition.src[0],
                            imageDefinition.src[1],
                            imageDefinition.src[2],
                            imageDefinition.src[3],

                            imageDefinition.dest[0],
                            imageDefinition.dest[1],
                            imageDefinition.src[2],
                            imageDefinition.src[3]
                        );

                        // Convert to <img>; needed for CanvasRenderer (sadly...)
                        var image = document.createElement('img');
                        image.src = canvas.toDataURL();

                        var assetName = imageDefinition.file;

                        // Le hack to inject a loaded asset into an AssetManager
                        assetManager.cache.get([ assetName, 'image' ], function () {
                            return image;
                        });
                    });

                    return sheetDefinition.images.map(function (imageDefinition) {
                        return imageDefinition.file;
                    });
                });
            }

            return xhr(assetManager.root + '/' + name)
                .then(function (xhr) {
                    var collection = JSON.parse(xhr.responseText);

                    // We map this to many promises to split the work into
                    // several event loop turns.  Otherwise, the browser may
                    // freeze for a second.
                    var promises = collection.sheets.map(function (sheetDefinition) {
                        return Q.ref(sheetDefinition).then(loadSheet);
                    });

                    return Q.all(promises);
                })
                .then(function (sheetFileLists) {
                    // Flatten the 2D array
                    return sheetFileLists.reduce(function (acc, array) {
                        return acc.concat(array);
                    }, [ ]);
                });
        },

        audio: function (assetManager, name) {
            var ret = Q.defer();

            var audio = new window.Audio();
            audio.autobuffer = true;
            audio.preload = 'auto';

            // Work around Webkit bug (present in Chrome <= 15, Safari <= 5, at
            // time of writing) where the browser will decide it doesn't /need/
            // to download all these pesky audio files.
            var globalName = randomGlobal();
            window[globalName] = audio;
            function cleanup() {
                delete window[globalName];
            }

            function fail(event) {
                if (audio.networkState === audio.NETWORK_NO_SOURCE) {
                    cleanup();
                    ret.reject(new Error('NETWORK_NO_SOURCE'));
                }
            }

            var originalTrack = document.createElement('source');
            originalTrack.src = assetManager.root + '/' + name;
            setAudioSourceType(originalTrack);
            originalTrack.onerror = fail;

            var vorbisTrack = document.createElement('source');
            vorbisTrack.src = assetManager.root + '/' + name + '.ogg';
            setAudioSourceType(vorbisTrack);
            vorbisTrack.onerror = fail;

            audio.addEventListener('canplaythrough', function () {
                cleanup();
                ret.resolve(audio);
            }, false);

            audio.addEventListener('error', function (event) {
                cleanup();
                ret.reject(new Error());
            }, false);

            audio.appendChild(originalTrack);
            audio.appendChild(vorbisTrack);

            audio.load();

            // Note that we can't do ret.promise.then(..., ...) to execute
            // cleanup() because of some weird Firefox quirk I can't be
            // bothered to investigate.
            return ret.promise;
        },

        sound: function (assetManager, name) {
            return AssetManager.typeHandlers.audio(assetManager, name);
        },

        video: function (assetManager, name) {
            // We just throw our hands up and say "we loaded null" if we can't
            // load the video, because it's not really a fatal condition.  We
            // should probably handle this condition somewhere else, though...

            var ret = Q.defer();

            var video = document.createElement('video');
            video.autobuffer = true;
            video.preload = 'auto';

            // Workaround for Webkit; see audio for details
            var globalName = randomGlobal();
            window[globalName] = video;
            function cleanup() {
                delete window[globalName];
            }

            function fail(event) {
                if (video.networkState === video.NETWORK_NO_SOURCE) {
                    cleanup();
                    ret.resolve(null);
                }
            }

            var originalTrack = document.createElement('source');
            originalTrack.src = assetManager.root + '/' + name;
            originalTrack.onerror = fail;

            var webmTrack = document.createElement('source');
            webmTrack.src = assetManager.root + '/' + name + '.webm';
            webmTrack.onerror = fail;

            var theoraTrack = document.createElement('source');
            theoraTrack.src = assetManager.root + '/' + name + '.ogv';
            theoraTrack.onerror = fail;

            video.addEventListener('canplay', function () {
                cleanup();
                ret.resolve(video);
            }, false);

            video.addEventListener('error', function (event) {
                cleanup();
                ret.resolve(null);
            }, false);

            video.appendChild(originalTrack);
            video.appendChild(webmTrack);
            video.appendChild(theoraTrack);

            video.load();

            return ret.promise;
        },

        map: function (assetManager, name) {
            return Q.ref(assetManager.load(name + '.osu', 'asset-config'))
                .then(function (assetConfig) {
                    var mapInfo = mapFile.readMap(assetConfig);

                    return mapInfo;
                });
        },

        'asset-config': function (assetManager, name) {
            return xhr(assetManager.root + '/' + name)
                .then(function (xhr) {
                    return assetConfig.parseString(xhr.responseText);
                });
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
        },

        archivedPreload: function (archive, obj) {
            var self = this;

            function cont() {
                return self.preload(obj);
            }

            // Errors are ignored; presumably, we don't need assets we can't
            // include outside the archive
            return Q.when(self.load(archive, 'archive'), cont, cont);
        }
    };

    return AssetManager;
});
