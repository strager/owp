define('game/Game', [ 'q', 'game/MapState', 'AssetManager', 'util/PubSub', 'Soundboard', 'util/Timeline', 'util/gPubSub', 'util/History', 'agentInfo', 'util/audioTimer', 'game/RuleSet', 'game/mapObject', 'game/Combo', 'game/TimingPoint', 'game/BezierSliderCurve', 'util/StateMachine', 'ui/UI' ], function (Q, MapState, AssetManager, PubSub, Soundboard, Timeline, gPubSub, History, agentInfo, audioTimer, RuleSet, mapObject, Combo, TimingPoint, BezierSliderCurve, StateMachine, UI) {
    var GameStateMachine = StateMachine.create([
        { name: 'load_play',   from: 'none',          to: 'loading'       },
        { name: 'loaded_play', from: 'loading',       to: 'ready_to_play' },
        { name: 'play',        from: 'ready_to_play', to: 'playing'       },
        { name: 'pause',       from: 'playing',       to: 'paused'        },
        { name: 'unpause',     from: 'paused',        to: 'playing'       },
        { name: 'end_map',     from: 'playing',       to: 'score_screen'  }
    ]);

    var MAP_END = 'mapEnd';

    function Game() {
        var skin = null;
        var mousePubSub = new PubSub();

        var mapInfo, mapState, audio;
        var mapAssetManager = null;
        var timeline = new Timeline();

        var boundEvents = [ ];

        function clearBoundEvents() {
            boundEvents.forEach(function (be) {
                be.unsubscribe();
            });
            boundEvents = [ ];
        }

        var renderCallback = null;
        var debugInfoCallback = null;

        var soundboard = null;
        var mouseHistory = new History();
        var isLeftDown = false;
        var isRightDown = false;
        var trackMouse = true;
        var currentTime = null;

        var scoreHistory = new History();
        var accuracyHistory = new History();
        var comboHistory = new History();

        var scoreScreenUi = null;

        var sm = new GameStateMachine('none', {
            on_load_play: function (mapRoot, mapName) {
                if (!skin) {
                    throw new Error('Must set a skin before starting a map');
                }

                renderCallback = function (renderer) {
                    renderer.renderLoading(Date.now());
                };

                mapAssetManager = new AssetManager(mapRoot);

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
                            currentTime = audioTimer.auto(audio);
                            mapState = MapState.fromMapInfo(mapInfo, timeline);
                        }),
                    Q.ref(skin)
                ]);

                Q.fail(load, agentInfo.crash);

                return load;
            },

            on_loaded_play: function () {
                var exitTime = mapState.ruleSet.getMapExitTime(mapInfo.map);
                timeline.add(MAP_END, true, exitTime);
            },

            enter_ready_to_play: function () {
                renderCallback = function (renderer) {
                    var time = 0;

                    renderer.renderStoryboard({
                        storyboard: mapInfo.storyboard,
                        assetManager: mapAssetManager,
                        breakiness: 0
                    }, time);
                    renderer.renderReadyToPlay(skin.valueOf(), time);
                };

                boundEvents.push(mousePubSub.subscribe(function (e) {
                    if (e.left || e.right) {
                        Q.fail(sm.play(), agentInfo.crash);
                    }
                }));
            },

            exit_ready_to_play: clearBoundEvents,

            enter_playing: function () {
                isLeftDown = false;
                isRightDown = false;

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

                renderCallback = function (renderer) {
                    var time = currentTime();
                    var breakiness = mapState.ruleSet.getBreakinessAt(time);

                    renderer.renderStoryboard({
                        storyboard: mapInfo.storyboard,
                        assetManager: mapAssetManager,
                        breakiness: breakiness
                    }, time);
                    renderer.renderMap({
                        ruleSet: mapState.ruleSet,
                        objects: mapState.getVisibleObjects(time),
                        skin: skin.valueOf(),
                        mouseHistory: mouseHistory
                    }, time);
                    renderer.renderHud({
                        skin: skin.valueOf(),
                        ruleSet: mapState.ruleSet,
                        scoreHistory: scoreHistory,
                        accuracyHistory: accuracyHistory,
                        comboHistory: comboHistory,
                        mapProgress: mapState.ruleSet.getMapProgress(mapInfo.map, time)
                    }, time);
                };

                debugInfoCallback = function () {
                    var time = currentTime();

                    return {
                        'current map time (ms)': time,
                        'current accuracy': accuracyHistory.getDataAtTime(time) * 100,
                        'current score': scoreHistory.getDataAtTime(time),
                        'current combo': comboHistory.getDataAtTime(time) + 'x'
                    };
                };

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

                    // Scale volume to how many hit sounds are being
                    // played
                    volume /= Math.sqrt(hitSounds.length);


                    hitSounds.forEach(function (soundName) {
                        soundboard.playSound(soundName, {
                            volume: volume
                        });
                    });
                }));

                boundEvents.push(timeline.subscribe(MAP_END, function () {
                    Q.fail(sm.end_map(), agentInfo.crash);
                }));

                boundEvents.push(gPubSub.subscribe(function () {
                    var time = currentTime();

                    mapState.processSlides(time, mouseHistory);
                    mapState.processMisses(time);

                    timeline.update(time);
                }));
            },

            exit_playing: function () {
                audio.pause();

                clearBoundEvents();
            },

            enter_paused: function () {
                renderCallback = function (renderer) {
                    var time = currentTime();
                    var breakiness = mapState.ruleSet.getBreakinessAt(time);

                    renderer.renderStoryboard({
                        storyboard: mapInfo.storyboard,
                        assetManager: mapAssetManager,
                        breakiness: breakiness
                    }, time);
                    renderer.renderMap({
                        ruleSet: mapState.ruleSet,
                        objects: mapState.getVisibleObjects(time),
                        skin: skin.valueOf(),
                        mouseHistory: mouseHistory
                    }, time);
                    renderer.renderHud({
                        skin: skin.valueOf(),
                        ruleSet: mapState.ruleSet,
                        scoreHistory: scoreHistory,
                        accuracyHistory: accuracyHistory,
                        comboHistory: comboHistory,
                        mapProgress: mapState.ruleSet.getMapProgress(mapInfo.map, time)
                    }, time);
                    renderer.renderColourOverlay([ 0, 0, 0, 128 ]);
                };
            },

            enter_score_screen: function () {
                scoreScreenUi = new UI();
                scoreScreenUi.build([
                    {
                        image: 'ranking-panel.png',
                        x: 320,
                        y: 480 - (640 * 698 / 1024) / 2,
                        width: 640
                    }, {
                        image: 'hit300.png',
                        x: 40,
                        y: 180,
                        scale: 0.25
                    }, {
                        image: 'hit100.png',
                        x: 40,
                        y: 230,
                        scale: 0.25
                    }, {
                        image: 'hit50.png',
                        x: 40,
                        y: 280,
                        scale: 0.25
                    }, {
                        image: 'hit0.png',
                        x: 220,
                        y: 280,
                        scale: 0.25
                    }, {
                        image: 'ranking-retry.png',
                        x: 396 + 122,
                        y: 305 + 14,
                        width: 244
                    }, {
                        image: 'ranking-replay.png',
                        x: 396 + 122,
                        y: 365 + 14,
                        width: 244
                    }, {
                        image: 'ranking-back.png',
                        x: 396 + 122,
                        y: 425 + 14,
                        width: 244
                    }, {
                        image: 'ranking-s.png',
                        x: 530,
                        y: 155,
                        scale: 0.7
                    }
                ]);

                renderCallback = function (renderer) {
                    renderer.renderUi(scoreScreenUi);
                };
            }
        });

        function loadSkin(skinRoot) {
            var skinAssetManager = new AssetManager(skinRoot);

            skin = Q.ref(skinAssetManager.load('skin', 'skin'))
                .then(function (skin_) {
                    return Q.when(skin_.preload(), function () {
                        soundboard = new Soundboard(skin_.assetManager);

                        // preload returns an array of assets;
                        // we want the actual skin object
                        return skin_;
                    }, agentInfo.crash);
                });

            return Q.fail(skin, agentInfo.crash);
        }

        function debugInfo() {
            if (debugInfoCallback) {
                return debugInfoCallback();
            }
        }

        function render(renderer) {
            renderer.beginRender();

            try {
                if (renderCallback) {
                    renderCallback.call(null, renderer);
                }
            } finally {
                renderer.endRender();
            }
        }

        return {
            startMap: function (mapRoot, mapName) {
                var p = sm.load_play(mapRoot, mapName)
                    .then(function () {
                        sm.loaded_play();
                    });

                Q.fail(p, agentInfo.crash);

                return p;
            },
            togglePause: function () {
                if (sm.canMakeTransition('pause')) {
                    sm.pause();
                } else if (sm.canMakeTransition('unpause')) {
                    sm.unpause();
                } else {
                    // Do nothing
                }
            },
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
