define('tutorial/Tutorial', [ 'q', 'Soundboard', 'game/RuleSet', 'game/MapState', 'util/PubSub', 'util/StateMachine', 'agentInfo', 'game/Combo', 'game/mapObject', 'util/History', 'util/ease', 'util/CoolAudio', 'util/Timeline', 'util/util', 'game/TimingPoint', 'gfx/View' ], function (Q, Soundboard, RuleSet, MapState, PubSub, StateMachine, agentInfo, Combo, mapObject, History, ease, CoolAudio, Timeline, util, TimingPoint, View) {
    var TutorialStateMachine = StateMachine.create([
        { name: 'start', from: 'none',        to: 'show_1'      },
        { name: 'next',  from: 'show_1',      to: 'play_1'      },
        { name: 'complete', from: 'play_1', to: 'show_2' },
    ]);

    function Tutorial(skin) {
        var mousePubSub = new PubSub();

        var mapState = null, hintMapState = null;
        var ruleSet = null, hintRuleSet = null;
        var mouseHistory = null, hintMouseHistory = null;
        var audio = null, hintAudio = null;
        var timeline = null, hintTimeline = null;

        var trackMouse = false;
        var allowMouse = false;
        var sourceObjects = null;

        var isLeftDown = false, isRightDown = false;
        mousePubSub.subscribe(function (e) {
            var time = audio ? audio.currentTime() : null;

            e = util.clone(e);
            var pos = View.map.playfieldToView(e.x, e.y);
            e.x = pos[0];
            e.y = pos[1];

            if (time !== null && trackMouse && mouseHistory) {
                mouseHistory.add(time, e);
            }

            if (allowMouse) {
                if (time !== null && mapState && e.left && !isLeftDown || e.right && !isRightDown) {
                    mapState.clickAt(e.x, e.y, time);
                }

                isLeftDown = e.left;
                isRightDown = e.right;
            }
        });

        var boundEvents = [ ];
        function clearBoundEvents() {
            boundEvents.forEach(function (be) {
                be.unsubscribe();
            });
            boundEvents = [ ];
        }

        var soundboard = new Soundboard(skin.assetManager);
        Q.fail(soundboard.preload([
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
        ]), agentInfo.crash);

        var sm = new TutorialStateMachine('none', {
            on_next: function () {
                hintMapState = mapState;
                hintRuleSet = ruleSet;
                hintMouseHistory = mouseHistory;
                hintAudio = audio;

                mapState = null;
                ruleSet = null;
                mouseHistory = null;
                audio = null;
            },

            enter_show_1: function () {
                sourceObjects = [
                    util.extend(new mapObject.HitCircle(2300, 256, 192), {
                        combo: new Combo(),
                        comboIndex: 0,
                        hitSounds: [ 'hitnormal' ]
                    })
                ];

                ruleSet = new RuleSet();
                ruleSet.circleSize = 3;
                ruleSet.addTimingPoint(TimingPoint.generic());
                ruleSet.getObjectStartAppearTime = function () {
                    return -Infinity;
                };
                ruleSet.getObjectEndAppearTime = function () {
                    return -Infinity;
                };

                audio = new CoolAudio(null);
                timeline = new Timeline(audio);
                mapState = new MapState(ruleSet, sourceObjects.map(mapObject.proto), timeline);

                trackMouse = false;
                allowMouse = false;
                mouseHistory = new History();
                mouseHistory.easing = function (a, b, t) {
                    return {
                        x: ease.scale(a.x, b.x, ease.smoothstep(0, 1, t)),
                        y: ease.scale(a.y, b.y, ease.smoothstep(0, 1, t)),
                        left: a.left,
                        right: a.right
                    };
                };

                mouseHistory.add(0, { x: 360, y: 120, left: false, right: false });
                mouseHistory.add(800, { x: 256, y: 192, left: false, right: false });
                mouseHistory.add(2300, { x: 256, y: 192, left: true, right: false });
                mouseHistory.add(2500, { x: 256, y: 192, left: false, right: false });

                timeline.add('next', null, 3500);
                timeline.subscribe('next', function () {
                    // End condition: user waited long enough
                    Q.fail(sm.next(), agentInfo.crash);
                });

                function playHitMarker(hitMarker) {
                    var hitSounds = ruleSet.getHitSoundNames(hitMarker);
                    var volume = ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

                    // Scale volume to how many hit sounds are being
                    // played
                    volume /= Math.sqrt(hitSounds.length);

                    hitSounds.forEach(function (soundName) {
                        soundboard.playSound(soundName, {
                            volume: volume
                        });
                    });
                }

                mapState.processMouseHistory(mouseHistory);

                audio.seek(0);
                audio.play();

                timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                    playHitMarker(hitMarker);
                });
            },

            enter_play_1: function () {
                ruleSet = hintRuleSet;
                audio = new CoolAudio(null);
                timeline = new Timeline(audio);
                mapState = new MapState(ruleSet, sourceObjects.map(mapObject.proto), timeline);

                trackMouse = false;
                allowMouse = true;
                mouseHistory = new History();

                function playHitMarker(hitMarker) {
                    var hitSounds = ruleSet.getHitSoundNames(hitMarker);
                    var volume = ruleSet.getHitSoundVolume(hitMarker.hitObject.time);

                    // Scale volume to how many hit sounds are being
                    // played
                    volume /= Math.sqrt(hitSounds.length);

                    hitSounds.forEach(function (soundName) {
                        soundboard.playSound(soundName, {
                            volume: volume
                        });
                    });
                }

                audio.seek(2300);

                boundEvents.push(mapState.events.hitMarker.subscribe(function (hitMarker) {
                    playHitMarker(hitMarker);

                    audio.play();

                    // End condition: hit marker created
                    setTimeout(function () {
                        sm.complete();
                    }, 1000);
                }));
            },

            enter_show_2: function () {
                console.log('TODO');
            }
        });

        return {
            render: function (renderer) {
                if (!mapState) {
                    return;
                }

                var time = audio.currentTime();

                renderer.renderMap({
                    ruleSet: ruleSet,
                    objects: mapState.getVisibleObjects(time),
                    skin: skin
                }, time);
                renderer.renderCursor({
                    mouseHistory: mouseHistory,
                    ruleSet: ruleSet,
                    skin: skin
                }, time);
            },

            start: function () {
                return sm.start();
            },

            events: {
                mouse: mousePubSub
            }
        };
    }

    return Tutorial;
});
