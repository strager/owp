define('Game', [ 'q', 'MapState', 'Util/PubSub', 'Soundboard', 'Util/Timeline', 'Util/gPubSub', 'Util/History' ], function (Q, MapState, PubSub, Soundboard, Timeline, gPubSub, History) {
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

        function setSkin(skinAssetManager) {
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

                var score = 0;
                var accuracy = 0;

                var mouseHistory = new History();
                var isLeftDown = false;
                var isRightDown = false;
                var trackMouse = true;

                setState({
                    render: function (renderer) {
                        var time = timeline.getCurrentTime();

                        // FIXME shouldn't be here exactly
                        accuracy = mapState.getAccuracy(time);
                        score = mapState.getScore(time);

                        renderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
                        renderer.renderMap({
                            mapState: mapState,
                            skin: skin.valueOf(),
                            mouseHistory: mouseHistory
                        }, time);
                    },
                    enter: function () {
                        audio.play();

                        boundEvents.push(mousePubSub.subscribe(function (e) {
                            var time = timeline.getCurrentTime();

                            if (trackMouse) {
                                mouseHistory.add(time, e);
                            }

                            if (e.left && !isLeftDown || e.right && !isRightDown) {
                                mapState.clickAt(e.x, e.y, time);
                            }

                            isLeftDown = e.left;
                            isRightDown = e.right;
                        }));

                        boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                            if (!hitMarker.score) {
                                return;
                            }

                            var hitSounds = mapState.ruleSet.getHitSoundNames(hitMarker);

                            // Note that osu! uses the hit marker time itself,
                            // where we use the more mapper-friendly hit object
                            // time.
                            var volume = mapState.ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

                            hitSounds.forEach(function (soundName) {
                                soundboard.playSound(soundName, {
                                    // Scale volume to how many hit sounds are
                                    // being played
                                    volume: volume / hitSounds.length
                                });
                            });

                            gPubSub.publish('tick');
                        }));

                        gPubSub.subscribe(function () {
                            var time = timeline.getCurrentTime();

                            mapState.processSlides(time, mouseHistory);
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
                            'current score': score
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

            return Q.ref(load).then(play);
        }

        function debugInfo() {
            if (currentState && currentState.debugInfo) {
                return currentState.debugInfo();
            }
        }

        return {
            startMap: startMap,
            render: render,
            setSkin: setSkin,
            mouse: function (e) {
                mousePubSub.publishSync(e);
            },
            debugInfo: debugInfo
        };
    }

    return Game;
});
