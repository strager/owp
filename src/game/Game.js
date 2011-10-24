define('game/Game', [ 'q', 'game/MapState', 'AssetManager', 'util/PubSub', 'Soundboard', 'util/Timeline', 'util/History', 'agentInfo', 'game/RuleSet', 'game/mapObject', 'game/Combo', 'game/TimingPoint', 'game/BezierSliderCurve', 'util/StateMachine', 'ui/UI', 'util/util', 'gfx/View', 'util/CoolAudio', 'game/CompoundStoryboard' ], function (Q, MapState, AssetManager, PubSub, Soundboard, Timeline, History, agentInfo, RuleSet, mapObject, Combo, TimingPoint, BezierSliderCurve, StateMachine, UI, util, View, CoolAudio, CompoundStoryboard) {
    var GameStateMachine = StateMachine.create([
        { name: 'load_play',    from: 'none',          to: 'loading'       },
        { name: 'loaded_play',  from: 'loading',       to: 'ready_to_play' },
        { name: 'play',         from: 'ready_to_play', to: 'playing'       },
        { name: 'pause',        from: 'playing',       to: 'paused'        },
        { name: 'unpause',      from: 'paused',        to: 'playing'       },
        { name: 'end_map',      from: 'playing',       to: 'score_screen'  },
        { name: 'watch_replay', from: 'score_screen',  to: 'playing'       }
    ]);

    var MAP_END = 'mapEnd';

    function Game() {
        var skin = null;
        var mousePubSub = new PubSub();

        var mapInfo, mapState, audio, timeline;
        var storyboard = null;
        var mapAssetManager = null;

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

        var isReplaying = false;

        var scoreHistory = new History();
        var accuracyHistory = new History();
        var comboHistory = new History();

        var ui = null;

        function renderMap(renderer, time) {
            var breakiness = mapState.ruleSet.getBreakinessAt(time);

            renderer.renderStoryboard({
                storyboard: storyboard,
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
        }

        var sm = new GameStateMachine('none', {
            on_load_play: function (mapRoot, mapName) {
                if (!skin) {
                    throw new Error('Must set a skin before starting a map');
                }

                renderCallback = function (renderer) {
                    renderer.renderLoading(Date.now());
                };

                mapAssetManager = new AssetManager(mapRoot);

                var extraStoryboard = null;

                // TODO Refactor this mess
                var load = Q.all([
                    Q.ref(mapAssetManager.load(mapName.replace(/ \[[^\]]+\]$/, ''), 'storyboard'))
                        .then(function (storyboard) {
                            return storyboard.preload(mapAssetManager)
                                .then(function () {
                                    extraStoryboard = storyboard;
                                });
                        }, function (err) {
                            // Storyboard couldn't be loaded.  Not the end of
                            // the world.  Just keep on goin'.
                        }),
                    Q.ref(mapAssetManager.load(mapName, 'map'))
                        .then(function (mapInfo_) {
                            mapInfo = mapInfo_;

                            return Q.all([
                                mapAssetManager.load(mapInfo.audioFile, 'audio'),
                                mapInfo.storyboard.preload(mapAssetManager)
                            ]);
                        })
                        .then(function (r) {
                            audio = new CoolAudio(r[0]);
                            timeline = new Timeline(audio);
                            mapState = MapState.fromMapInfo(mapInfo, timeline);
                        }),
                    Q.ref(skin)
                ]).then(function () {
                    if (extraStoryboard) {
                        storyboard = new CompoundStoryboard([
                            extraStoryboard,
                            mapInfo.storyboard
                        ]);
                    } else {
                        storyboard = mapInfo.storyboard;
                    }
                });

                Q.fail(load, agentInfo.crash);

                return load;
            },

            on_loaded_play: function () {
                var exitTime = mapState.ruleSet.getMapExitTime(mapInfo.map);
                timeline.add(MAP_END, true, exitTime);

                audio.seek(-mapState.ruleSet.audioLeadIn);
            },

            enter_ready_to_play: function () {
                renderCallback = function (renderer) {
                    var time = 0;

                    renderer.renderStoryboard({
                        storyboard: storyboard,
                        assetManager: mapAssetManager,
                        breakiness: 0
                    }, time);
                    renderer.renderReadyToPlay(skin.valueOf(), time);
                };

                var started = false;

                boundEvents.push(mousePubSub.subscribe(function (e) {
                    if ((e.left || e.right) && !started) {
                        started = true;
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

                var latestSkipTime = mapState.ruleSet.getMapLatestSkipTime(mapInfo.map);
                var skipToTime = mapState.ruleSet.getMapSkipToTime(mapInfo.map);

                function canSkip() {
                    var time = audio.currentTime();
                    return time < latestSkipTime && audio.canSeek(skipToTime);
                }

                ui = new UI(skin.valueOf().assetManager);
                boundEvents.push(mousePubSub.subscribe(function (e) {
                    if (canSkip()) {
                        ui.mouse.publish(e);
                    }
                }));

                ui.build([
                    {
                        image: 'play-skip.png',
                        x: 640,
                        y: 480,
                        alignX: 1,
                        alignY: 1,
                        scale: 0.5,

                        click: { action: 'skip' }
                    }
                ]);

                ui.events.skip = new PubSub();
                ui.events.skip.subscribe(function () {
                    audio.seek(skipToTime);
                });

                renderCallback = function (renderer) {
                    var time = audio.currentTime();
                    renderMap(renderer, time);

                    if (canSkip()) {
                        renderer.renderUi(ui);
                    }

                    if (isReplaying) {
                        renderer.renderCursor({
                            skin: skin.valueOf(),
                            mouseHistory: mouseHistory,
                            ruleSet: mapState.ruleSet
                        }, time);
                    } else {
                        renderer.renderCurrentCursor({
                            skin: skin.valueOf(),
                            mouseHistory: mouseHistory,
                            ruleSet: mapState.ruleSet
                        }, time);
                    }
                };

                debugInfoCallback = function () {
                    var time = audio.currentTime();

                    return {
                        'current map time (ms)': time,
                        'current accuracy': accuracyHistory.getDataAtTime(time) * 100,
                        'current score': scoreHistory.getDataAtTime(time),
                        'current combo': comboHistory.getDataAtTime(time) + 'x'
                    };
                };

                audio.play();

                if (!isReplaying) {
                    boundEvents.push(mousePubSub.subscribe(function (e) {
                        var time = audio.currentTime();

                        e = util.clone(e);
                        var pos = View.map.playfieldToView(e.x, e.y);
                        e.x = pos[0];
                        e.y = pos[1];

                        mouseHistory.add(time, e);

                        if (e.left && !isLeftDown || e.right && !isRightDown) {
                            mapState.clickAt(e.x, e.y, time);
                        }

                        isLeftDown = e.left;
                        isRightDown = e.right;
                    }));
                }

                function playHitMarker(hitMarker) {
                    var hitSounds = mapState.ruleSet.getHitSoundNames(hitMarker);
                    var volume = mapState.ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

                    // Scale volume to how many hit sounds are being
                    // played
                    volume /= Math.sqrt(hitSounds.length);

                    hitSounds.forEach(function (soundName) {
                        soundboard.playSound(soundName, {
                            volume: volume
                        });
                    });
                }

                boundEvents.push(mapState.events.hitMarker.subscribe(function (hitMarker) {
                    playHitMarker(hitMarker);

                    var time = hitMarker.time;

                    var accuracy = mapState.getAccuracy(time);
                    var score = mapState.getScore(time);

                    var combo = mapState.getActiveCombo(time);

                    accuracyHistory.add(time, accuracy);
                    scoreHistory.add(time, score);
                    comboHistory.add(time, combo);
                }));

                boundEvents.push(timeline.subscribe(MAP_END, function () {
                    Q.fail(sm.end_map(), agentInfo.crash);
                }));

                if (isReplaying) {
                    boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                        playHitMarker(hitMarker);
                    }));
                }

                if (!isReplaying) {
                    boundEvents.push(timeline.subscribe(MapState.HIT_SLIDE_CHECK, function (object) {
                        mapState.processSlide(object, mouseHistory);
                    }));
                    boundEvents.push(timeline.subscribe(MapState.HIT_MISS_CHECK, function (object) {
                        mapState.processMiss(object);
                    }));
                }
            },

            exit_playing: function () {
                clearBoundEvents();
            },

            enter_paused: function () {
                audio.pause();

                ui = new UI(skin.valueOf().assetManager);
                boundEvents.push(mousePubSub.pipeTo(ui.mouse));

                ui.build([
                    {
                        image: 'pause-continue.png',
                        x: 320,
                        y: 200,
                        alignX: 0.5,
                        alignY: 0.5,
                        scale: 1.0,

                        hover: { scale: 1.1 },
                        click: { action: 'play' }
                    }, {
                        image: 'pause-back.png',
                        x: 320,
                        y: 330,
                        alignX: 0.5,
                        alignY: 0.5,
                        scale: 1.0,

                        hover: { scale: 1.1 },
                        click: { action: 'menu' }
                    }
                ]);

                ui.events.play = new PubSub();
                ui.events.play.subscribe(function () {
                    sm.unpause();
                });

                ui.events.menu = new PubSub();
                ui.events.menu.subscribe(function () {
                    // HACK =]
                    window.location = '.';
                });

                renderCallback = function (renderer) {
                    var time = audio.currentTime();
                    renderMap(renderer, time);
                    renderer.renderColourOverlay([ 0, 0, 0, 128 ]);
                    renderer.renderUi(ui);
                };
            },

            exit_paused: function () {
                clearBoundEvents();
                audio.play();
            },

            enter_score_screen: function () {
                ui = new UI(skin.valueOf().assetManager);
                boundEvents.push(mousePubSub.pipeTo(ui.mouse));

                ui.build([
                    {
                        image: 'ranking-panel.png',
                        x: 0,
                        y: 480,
                        alignX: 0,
                        alignY: 1,
                        width: 640
                    }, {
                        image: 'hit300.png',
                        x: 40,
                        y: 180,
                        scale: 0.3
                    }, {
                        text: '${hit300}x',
                        x: 70,
                        y: 180,
                        characterScale: 0.6,
                        alignX: 0
                    }, {
                        image: 'hit100.png',
                        x: 40,
                        y: 230,
                        scale: 0.3
                    }, {
                        text: '${hit100}x',
                        x: 70,
                        y: 230,
                        characterScale: 0.6,
                        alignX: 0
                    }, {
                        image: 'hit50.png',
                        x: 40,
                        y: 280,
                        scale: 0.3
                    }, {
                        text: '${hit50}x',
                        x: 70,
                        y: 280,
                        characterScale: 0.6,
                        alignX: 0
                    }, {
                        image: 'hit0.png',
                        x: 220,
                        y: 280,
                        scale: 0.3
                    }, {
                        text: '${hit0}x',
                        x: 250,
                        y: 280,
                        characterScale: 0.6,
                        alignX: 0
                    //}, {
                    //    name: 'retry button',
                    //    image: 'ranking-retry.png',
                    //    x: 396,
                    //    y: 319,
                    //    alignX: 0,
                    //    alignY: 0.5,
                    //    width: 244,

                    //    hover: { width: 268 },
                    //    ease: { width: [ 'smoothstep', 200 ] }
                    }, {
                        name: 'replay button',
                        image: 'ranking-replay.png',
                        x: 396,
                        y: 379,
                        alignX: 0,
                        alignY: 0.5,
                        width: 244,

                        hover: { width: 268 },
                        click: { action: 'replay' },

                        ease: { width: [ 'smoothstep', 200 ] }
                    }, {
                        image: 'ranking-back.png',
                        x: 396,
                        y: 439,
                        alignX: 0,
                        alignY: 0.5,
                        width: 244,

                        hover: { width: 268 },
                        click: { action: 'menu' },

                        ease: { width: [ 'smoothstep', 200 ] }
                    }, {
                        image: 'ranking-${rank}.png',
                        x: 530,
                        y: 155,
                        scale: 0.7
                    }, {
                        text: '${score}',
                        characterScale: 0.7,
                        x: 276,
                        y: 107,
                        alignX: 1,
                        alignY: 1
                    }, {
                        text: '${accuracy}%',
                        characterScale: 0.7,
                        x: 194,
                        y: 346,
                        alignX: 0,
                        alignY: 0.5
                    }, {
                        text: '${maxCombo}x',
                        characterScale: 0.7,
                        x: 18,
                        y: 346,
                        alignX: 0,
                        alignY: 0.5
                    }
                ]);

                ui.events.menu = new PubSub();
                ui.events.menu.subscribe(function () {
                    // HACK =]
                    window.location = '.';
                });

                ui.events.replay = new PubSub();
                ui.events.replay.subscribe(function () {
                    Q.fail(sm.watch_replay(), agentInfo.crash);
                });

                var hist = mapState.ruleSet.getHitMarkerHistogram(mapState.getAllHitMarkers())
                ui.vars.hit300 = hist.hit300;
                ui.vars.hit100 = hist.hit100;
                ui.vars.hit50 = hist.hit50;
                ui.vars.hit0 = hist.hit0;

                ui.vars.maxCombo = 0;
                comboHistory.map.forEach(function (time, combo) {
                    ui.vars.maxCombo = Math.max(ui.vars.maxCombo, combo);
                });

                ui.vars.score = scoreHistory.getLast(0);
                ui.vars.accuracy = (accuracyHistory.getLast(0) * 100).toFixed(2);
                ui.vars.rank = mapState.ruleSet.getTotalRank(mapState.getAllHitMarkers());

                renderCallback = function (renderer) {
                    renderer.renderColourOverlay([ 0, 0, 0, 255 ]);
                    renderer.renderUi(ui);
                };
            },

            on_watch_replay: function () {
                isReplaying = true;

                timeline = new Timeline(audio);
                var exitTime = mapState.ruleSet.getMapExitTime(mapInfo.map);
                timeline.add(MAP_END, true, exitTime);

                mapState = MapState.fromMapInfo(mapInfo, timeline);
                mapState.processMouseHistory(mouseHistory);

                audio.seek(-mapState.ruleSet.audioLeadIn);
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
