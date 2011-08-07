define('Game', [ 'q', 'MapState', 'Util/PubSub', 'Soundboard', 'Util/Timeline', 'Util/gPubSub', 'Util/History', 'agentInfo', 'Util/audioTimer' ], function (Q, MapState, PubSub, Soundboard, Timeline, gPubSub, History, agentInfo, audioTimer) {
    function Game() {
        var currentState = null;
        var skin = null;

        var mousePubSub = new PubSub();

        function render(renderer) {
            renderer.beginRender();

            try {
                if (currentState && currentState.render) {
                    currentState.render.call(null, renderer);
                }
            } finally {
                renderer.endRender();
            }
        }

        function loadSkin(skinAssetManager) {
            skin = Q.ref(skinAssetManager.load('skin', 'skin'))
                .then(function (skin_) {
                    return Q.ref(skin_.preload())
                        .then(function () {
                            // preload returns an array of assets;
                            // we want the actual skin object
                            return skin_;
                        });
                });

            // Let callers know when the skin is loaded,
            // but don't let them know about the skin
            return Q.when(skin, function () { });
        }

        function setState(state) {
            if (currentState && currentState.leave) {
                currentState.leave();
            }

            currentState = state;

            if (currentState && currentState.enter) {
                currentState.enter();
            }
        }

        function startMap(mapAssetManager, mapName) {
            var mapInfo, mapState, audio;
            var timeline = null;
            var boundEvents = [ ];

            function play() {
                var soundboard = new Soundboard(skin.valueOf().assetManager);
                soundboard.preload([
                    'normal-hitclap.wav',
                    'normal-hitfinish.wav',
                    'normal-hitnormal.wav',
                    'normal-hitwhistle.wav',
                    'normal-sliderslide.wav',
                    'normal-slidertick.wav',
                    'normal-sliderwhistle.wav',

                    'soft-hitclap.wav',
                    'soft-hitfinish.wav',
                    'soft-hitnormal.wav',
                    'soft-hitwhistle.wav',
                    'soft-sliderslide.wav',
                    'soft-slidertick.wav'
                ]);

                var mouseHistory = new History();
                var isLeftDown = false;
                var isRightDown = false;
                var trackMouse = true;

                var scoreHistory = new History();
                var accuracyHistory = new History();
                var comboHistory = new History();

                var currentTime = audioTimer.auto(audio);

                setState({
                    render: function (renderer) {
                        var time = currentTime();

                        renderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
                        renderer.renderMap({
                            mapState: mapState,
                            skin: skin.valueOf(),
                            mouseHistory: mouseHistory
                        }, time);
                        renderer.renderHud({
                            skin: skin.valueOf(),
                            ruleSet: mapState.ruleSet,
                            scoreHistory: scoreHistory,
                            accuracyHistory: accuracyHistory,
                            comboHistory: comboHistory
                        }, time);
                    },
                    enter: function () {
                        audio.play();

                        boundEvents.push(mousePubSub.subscribe(function (e) {
                            var time = currentTime();

                            if (trackMouse) {
                                mouseHistory.add(time, e);
                            }

                            if (e.left && !isLeftDown || e.right && !isRightDown) {
                                mapState.clickAt(e.x, e.y, time);
                            }

                            isLeftDown = e.left;
                            isRightDown = e.right;
                        }));

                        boundEvents.push(mapState.events.subscribe(function (hitMarker) {
                            var time = hitMarker.time;

                            var accuracy = mapState.getAccuracy(time);
                            var score = mapState.getScore(time);

                            var combo = mapState.getActiveCombo(time);

                            accuracyHistory.add(time, accuracy);
                            scoreHistory.add(time, score);
                            comboHistory.add(time, combo);
                        }));

                        boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                            var hitSounds = mapState.ruleSet.getHitSoundNames(hitMarker);

                            // Note that osu! uses the hit marker time itself,
                            // where we use the more mapper-friendly hit object
                            // time.  FIXME Maybe this detail should be moved
                            // to RuleSet (i.e. pass in a HitMarker)?
                            var volume = mapState.ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

                            hitSounds.forEach(function (soundName) {
                                soundboard.playSound(soundName, {
                                    // Scale volume to how many hit sounds are
                                    // being played
                                    volume: volume / hitSounds.length
                                });
                            });
                        }));

                        gPubSub.subscribe(function () {
                            var time = currentTime();

                            mapState.processSlides(time, mouseHistory);
                            mapState.processMisses(time);

                            timeline.update(time);
                        });
                    },
                    leave: function () {
                        boundEvents.forEach(function (be) {
                            be.unsubscribe();
                        });
                        boundEvents = [ ];
                    },
                    debugInfo: function () {
                        var time = currentTime();

                        return {
                            'current map time (ms)': time,
                            'current accuracy': accuracyHistory.getDataAtTime(time) * 100,
                            'current score': scoreHistory.getDataAtTime(time),
                            'current combo': comboHistory.getDataAtTime(time) + 'x'
                        };
                    }
                });
            }

            if (!skin) {
                throw new Error('Must set a skin before starting a map');
            }

            // TODO Refactor this mess
            var load = Q.all([
                Q.ref(mapAssetManager.load(mapName, 'map'))
                    .then(function (mapInfo_) {
                        mapInfo = mapInfo_;

                        return Q.all([
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
                Q.ref(skin)
            ]);

            function loading() {
                setState({
                    render: function (renderer) {
                        if (Q.isFulfilled(load)) {
                            // TODO
                            //renderer.renderReadyToPlay();
                            renderer.renderLoading(Date.now());
                        } else {
                            renderer.renderLoading(Date.now());
                        }
                    },
                    enter: function () {
                        boundEvents.push(mousePubSub.subscribe(function (e) {
                            if (e.left || e.right) {
                                play();
                            }
                        }));
                    },
                    leave: function () {
                        boundEvents.forEach(function (be) {
                            be.unsubscribe();
                        });
                        boundEvents = [ ];
                    }
                });
            }

            loading();

            return Q.when(load, null, agentInfo.crash);
        }

        function debugInfo() {
            if (currentState && currentState.debugInfo) {
                return currentState.debugInfo();
            }
        }

        return {
            startMap: startMap,
            render: render,
            loadSkin: loadSkin,
            mouse: function (e) {
                mousePubSub.publishSync(e);
            },
            debugInfo: debugInfo
        };
    }

    return Game;
});
