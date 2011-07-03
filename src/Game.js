define('Game', [ 'q', 'MapState', 'Util/PubSub', 'Soundboard', 'Util/Timeline', 'Util/gPubSub' ], function (Q, MapState, PubSub, Soundboard, Timeline, gPubSub) {
    var Game = function () {
        var currentState = null;
        var skin = null;

        var clickPubSub = new PubSub();

        var render = function (renderer) {
            renderer.beginRender();

            try {
                if (currentState && currentState.render) {
                    currentState.render.call(null, renderer);
                }
            } finally {
                renderer.endRender();
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
            var timeline = null;
            var boundEvents = [ ];

            var play = function () {
                var soundboard = new Soundboard(skin.valueOf().assetManager);

                var score = 0;
                var accuracy = 0;

                setState({
                    render: function (renderer) {
                        var time = timeline.getCurrentTime();

                        // FIXME shouldn't be here exactly
                        accuracy = mapState.getAccuracy(time);
                        score = mapState.getScore(time);

                        renderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
                        renderer.renderMap(mapState, skin.valueOf(), time);
                    },
                    enter: function () {
                        audio.currentTime = 33; // XXX TEMP
                        audio.play();

                        boundEvents.push(clickPubSub.subscribe(function (e) {
                            mapState.clickAt(e.x, e.y, timeline.getCurrentTime());
                        }));

                        boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                            mapState.ruleSet.getHitSoundNames(hitMarker).forEach(function (soundName) {
                                soundboard.playSound(soundName);
                            });

                            gPubSub.publish('tick');
                        }));

                        gPubSub.subscribe(function () {
                            var time = timeline.getCurrentTime();

                            mapState.processMisses(time);

                            timeline.update(time);
                        });
                    },
                    leave: function () {
                        boundEvents.forEach(function (be) {
                            be.unsubscribe();
                        });
                    },
                    debugInfo: function () {
                        return {
                            'current map time (ms)': timeline.getCurrentTime(),
                            'current accuracy': accuracy * 100,
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

                        return Q.shallow([
                            mapAssetManager.load(mapInfo.audioFile, 'audio'),
                            mapInfo.storyboard.preload(mapAssetManager)
                        ]);
                    })
                    .then(function (r) {
                        audio = r[0];

                        audio.controls = 'controls';
                        document.body.appendChild(audio);

                        timeline = new Timeline(audio);

                        mapState = MapState.fromMapInfo(mapInfo, timeline);
                    }),
                Q.when(skin)
            ]);

            return Q.when(load).then(play);
        };

        var click = function () {
            clickPubSub.publishSync.apply(clickPubSub, arguments);
        };

        var debugInfo = function () {
            if (currentState && currentState.debugInfo) {
                return currentState.debugInfo();
            }
        };

        return {
            startMap: startMap,
            render: render,
            setSkin: setSkin,
            click: click,
            debugInfo: debugInfo
        };
    };

    return Game;
});
