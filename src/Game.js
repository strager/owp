define('Game', [ 'q', 'MapState', 'Util/PubSub' ], function (Q, MapState, PubSub) {
    var Game = function () {
        var currentState = null;
        var skin = null;

        var events = new PubSub();

        var render = function (renderer) {
            renderer.beginRender();

            try {
                if (currentState && currentState.render) {
                    currentState.render.call(null, renderer);
                }
            } catch (e) {
                // wtb `finally`
                renderer.endRender();

                throw e;
            }

            renderer.endRender();
        };

        var update = function () {
            if (currentState && currentState.update) {
                currentState.update();
            }
        };

        var setSkin = function (skinAssetManager) {
            skin = Q.when(skinAssetManager.load('skin', 'skin'))
                .then(function (skin_) {
                    return Q.when(skin_.preload())
                        .then(function () {
                            // preload returns an array of assets;
                            // we want the actual skin object
                            return skin_;
                        });
                });

            // Let callers know when the skin is loaded,
            // but don't let them know about the skin
            return Q.when(skin, function () { });
        };

        var setState = function (state) {
            if (currentState && currentState.leave) {
                currentState.leave();
            }

            currentState = state;

            if (currentState && currentState.enter) {
                currentState.enter();
            }
        };

        var startMap = function (mapAssetManager, mapName) {
            var mapInfo, mapState, audio;
            var boundEvents = [ ];

            var play = function () {
                var getMapTime = null;
                var score = 0;

                setState({
                    render: function (renderer) {
                        var time = getMapTime();
                        score = mapState.getScore(time); // FIXME shouldn't be here exactly

                        renderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
                        renderer.renderMap(mapState, skin.valueOf(), time);
                    },
                    update: function () {
                        var time = getMapTime();

                        mapState.processMisses(time);
                    },
                    enter: function () {
                        audio.currentTime = 33; // XXX TEMP
                        audio.play();

                        getMapTime = function () {
                            return Math.round(audio.currentTime * 1000);
                        };

                        boundEvents.push(events.subscribe('click', function (e) {
                            mapState.clickAt(e.x, e.y, getMapTime());
                        }));
                    },
                    leave: function () {
                        boundEvents.forEach(function (be) {
                            be.unsubscribe();
                        });
                    },
                    debugInfo: function () {
                        return {
                            'current map time (ms)': getMapTime(),
                            'current score': score,
                        };
                    }
                });
            };

            if (!skin) {
                throw new Error('Must set a skin before starting a map');
            }

            // TODO Refactor this mess
            var load = Q.shallow([
                Q.when(mapAssetManager.load(mapName, 'map'))
                    .then(function (mapInfo_) {
                        mapInfo = mapInfo_;
                        mapState = MapState.fromMapInfo(mapInfo);

                        return Q.shallow([
                            mapAssetManager.load(mapInfo.audioFile, 'audio'),
                            mapInfo.storyboard.preload(mapAssetManager)
                        ]);
                    })
                    .then(function (r) {
                        audio = r[0];

                        audio.controls = 'controls';
                        document.body.appendChild(audio);
                    }),
                Q.when(skin)
            ]);

            return Q.when(load).then(play);
        };

        var event = function (key) {
            events.publishSync.apply(events, arguments);
        };

        var debugInfo = function () {
            if (currentState && currentState.debugInfo) {
                return currentState.debugInfo();
            }
        };

        return {
            startMap: startMap,
            render: render,
            update: update,
            setSkin: setSkin,
            event: event,
            debugInfo: debugInfo
        };
    };

    return Game;
});
