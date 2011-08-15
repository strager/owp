define('Game', [ 'q', 'MapState', 'AssetManager', 'Util/PubSub', 'Soundboard', 'Util/Timeline', 'Util/gPubSub', 'Util/History', 'agentInfo', 'Util/audioTimer', 'RuleSet', 'mapObject', 'Combo', 'TimingPoint' ], function (Q, MapState, AssetManager, PubSub, Soundboard, Timeline, gPubSub, History, agentInfo, audioTimer, RuleSet, mapObject, Combo, TimingPoint) {
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

        function loadSkin(skinRoot) {
            var skinAssetManager = new AssetManager(skinRoot);

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
            return Q.when(skin, function () { }, agentInfo.crash);
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

        function startMap(mapRoot, mapName) {
            if (!skin) {
                throw new Error('Must set a skin before starting a map');
            }

            var mapAssetManager = new AssetManager(mapRoot);

            var mapInfo, mapState, audio;
            var timeline = new Timeline();
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

                        mapState = MapState.fromMapInfo(mapInfo, timeline);
                    }),
                Q.ref(skin)
            ]);

            function readyToPlay() {
                setState({
                    render: function (renderer) {
                        var time = 0;

                        renderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
                        renderer.renderReadyToPlay(skin.valueOf(), time);
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

            function loading() {
                setState({
                    render: function (renderer) {
                        renderer.renderLoading(Date.now());
                    }
                });
            }

            loading();

            return Q.when(load, readyToPlay, agentInfo.crash);
        }

        function tutorial() {
            if (!skin) {
                throw new Error('Must set a skin before starting a map');
            }

            var timing = new TimingPoint({
                time: 2040,
                bpm: 121,
                isInherited: false,
                hitSoundVolume: 1,
                sampleSet: 'normal'
            });

            var ruleSet = new RuleSet();
            ruleSet.circleSize = 3;
            ruleSet.uninheritedTimingPointHistory.add(timing.time, timing);
            ruleSet.approachRate = 3;

            var audio, currentTime;
            var boundEvents = [ ];

            var combos = [
                new Combo([ 255, 255, 128 ]),
                new Combo([ 255, 128, 255 ]),
                new Combo([ 128, 255, 255 ]),
                new Combo([ 192, 192, 192 ])
            ];

            function beat(n) {
                return n / (timing.bpm / 60) * 1000 + timing.time;
            }

            var measureCount = 20;

            function screen0() {
                var soundboard = new Soundboard(skin.valueOf().assetManager);
                var timeline = new Timeline();
                var mapState = new MapState(ruleSet, [ ], timeline);

                for (var i = 0; i < measureCount; ++i) {
                    var curCombo = combos[i % combos.length];
                    var x = 60;
                    var y = 80;

                    // 300
                    var hitObject = new mapObject.HitCircle(beat(i * 16), x, y);
                    hitObject.hitSounds = [ 'hitnormal' ];
                    hitObject.comboIndex = 0;
                    hitObject.combo = curCombo;
                    mapState.addHitObject(hitObject);

                    var hitTime = hitObject.time;
                    var hitMarker = new mapObject.HitMarker(hitObject, hitTime, ruleSet.getHitScore(hitObject, hitTime), true);
                    mapState.applyHitMarker(hitMarker);

                    // 100
                    var hitObject = new mapObject.HitCircle(beat(i * 16 + 4), x, y);
                    hitObject.hitSounds = [ 'hitnormal' ];
                    hitObject.comboIndex = 1;
                    hitObject.combo = curCombo;
                    mapState.addHitObject(hitObject);

                    var hitTime = hitObject.time + 80;
                    var hitMarker = new mapObject.HitMarker(hitObject, hitTime, ruleSet.getHitScore(hitObject, hitTime), true);
                    mapState.applyHitMarker(hitMarker);

                    // 50
                    var hitObject = new mapObject.HitCircle(beat(i * 16 + 8), x, y);
                    hitObject.hitSounds = [ 'hitnormal' ];
                    hitObject.comboIndex = 2;
                    hitObject.combo = curCombo;
                    mapState.addHitObject(hitObject);

                    var hitTime = hitObject.time - 150;
                    var hitMarker = new mapObject.HitMarker(hitObject, hitTime, ruleSet.getHitScore(hitObject, hitTime), true);
                    mapState.applyHitMarker(hitMarker);

                    // X
                    var hitObject = new mapObject.HitCircle(beat(i * 16 + 12), x, y);
                    hitObject.hitSounds = [ 'hitnormal' ];
                    hitObject.comboIndex = 3;
                    hitObject.combo = curCombo;
                    mapState.addHitObject(hitObject);

                    var hitTime = ruleSet.getObjectLatestHitTime(hitObject) + 1;
                    var hitMarker = new mapObject.HitMarker(hitObject, hitTime, ruleSet.getHitScore(hitObject, hitTime), false);
                    mapState.applyHitMarker(hitMarker);
                }

                setState({
                    render: function (renderer) {
                        var time = currentTime();

                        renderer.renderMap({
                            ruleSet: ruleSet,
                            objects: mapState.getVisibleObjects(time),
                            skin: skin.valueOf(),
                            mouseHistory: null
                        }, time);
                    },
                    enter: function () {
                        audio.play();

                        boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                            var hitSounds = ruleSet.getHitSoundNames(hitMarker);

                            // Note that osu! uses the hit marker time itself,
                            // where we use the more mapper-friendly hit object
                            // time.  FIXME Maybe this detail should be moved
                            // to RuleSet (i.e. pass in a HitMarker)?
                            var volume = ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

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
                            timeline.update(time);
                        });

                        boundEvents.push(mousePubSub.subscribe(function (e) {
                            if (e.left || e.right) {
                                screen1();
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

            function screen1() {
                var soundboard = new Soundboard(skin.valueOf().assetManager);
                var timeline = new Timeline();
                var mapState = new MapState(ruleSet, [ ], timeline);
                var mouseHistory = new History();

                var lastX = 0, lastY = 0;

                for (var i = 0; i < measureCount * 4; ++i) {
                    var curCombo = combos[Math.floor(i / 4) % combos.length];

                    var x = [ 120, 300, 300, 120 ][i % 4];
                    var y = [ 120, 120, 300, 300 ][i % 4];

                    var hitObject = new mapObject.HitCircle(beat(i * 4), x, y);
                    hitObject.hitSounds = [ 'hitnormal' ];
                    hitObject.comboIndex = i % 4;
                    hitObject.combo = curCombo;
                    mapState.addHitObject(hitObject);

                    var hitTime = hitObject.time;
                    var hitMarker = new mapObject.HitMarker(hitObject, hitTime, ruleSet.getHitScore(hitObject, hitTime), true);
                    mapState.applyHitMarker(hitMarker);

                    // Move le cursor
                    var fromTime = beat(i * 4 - 2.5);
                    var toTime = hitObject.time;

                    for (var j = fromTime; j < toTime; j += 10) {
                        var p = (j - fromTime) / (toTime - fromTime)

                        if (p < 0.2) {
                            p = p * Math.pow(0.2, 0.6) / 0.2;
                        } else {
                            p = Math.pow(p, 0.6);
                        }

                        mouseHistory.add(j, {
                            x: p * x + (1 - p) * lastX,
                            y: p * y + (1 - p) * lastY
                        });
                    }

                    lastX = x;
                    lastY = y;
                }

                setState({
                    render: function (renderer) {
                        var time = currentTime();

                        renderer.renderMap({
                            ruleSet: ruleSet,
                            objects: mapState.getVisibleObjects(time),
                            skin: skin.valueOf(),
                            mouseHistory: null
                        }, time);
                        renderer.renderCursor(skin.valueOf(), mouseHistory, time);
                    },
                    enter: function () {
                        audio.play();

                        boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                            var hitSounds = ruleSet.getHitSoundNames(hitMarker);

                            // Note that osu! uses the hit marker time itself,
                            // where we use the more mapper-friendly hit object
                            // time.  FIXME Maybe this detail should be moved
                            // to RuleSet (i.e. pass in a HitMarker)?
                            var volume = ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

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
                            timeline.update(time);
                        });
                    },
                    leave: function () {
                        boundEvents.forEach(function (be) {
                            be.unsubscribe();
                        });
                        boundEvents = [ ];
                    }
                });
            }

            function loading() {
                setState({
                    render: function (renderer) {
                        renderer.renderLoading(Date.now());
                    }
                });
            }

            loading();

            var load = Q.all([
                Q.ref(new AssetManager('.').load('Jeez Louise Lou Ease Le Ooz.mp3', 'audio'))
                    .then(function (audio_) {
                        audio = audio_;
                        currentTime = audioTimer.auto(audio);
                    }),
                skin
            ]);

            Q.when(load, screen0).then(null, agentInfo.crash);
        }

        function debugInfo() {
            if (currentState && currentState.debugInfo) {
                return currentState.debugInfo();
            }
        }

        return {
            startMap: startMap,
            tutorial: tutorial,
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
