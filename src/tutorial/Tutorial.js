define('tutorial/Tutorial', [ 'q', 'Soundboard', 'game/RuleSet', 'game/MapState', 'util/PubSub', 'util/StateMachine', 'agentInfo', 'game/Combo', 'game/mapObject', 'util/History', 'util/ease', 'util/CoolAudio', 'util/Timeline', 'util/util', 'game/TimingPoint', 'gfx/View' ], function (Q, Soundboard, RuleSet, MapState, PubSub, StateMachine, agentInfo, Combo, mapObject, History, ease, CoolAudio, Timeline, util, TimingPoint, View) {
    var TutorialStateMachine = StateMachine.create([
        { name: 'start',    from: 'none',   to: 'show_1' },
        { name: 'next',     from: 'show_1', to: 'play_1' },
        { name: 'complete', from: 'play_1', to: 'show_2' }
    ]);

    function Tutorial(skin) {
        var mousePubSub = new PubSub();
        var renderCallback = null;

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


        function clearState() {
            hintMapState = null;
            hintRuleSet = null;
            hintMouseHistory = null;
            hintAudio = null;
            hintTimeline = null;

            mapState = null;
            ruleSet = null;
            mouseHistory = null;
            audio = null;
            timeline = null;

            showHint = false;
        }

        function objects1(ox, oy) {
            return [
                util.extend(new mapObject.HitCircle(2300, 256 + ox, 192 + oy), {
                    combo: new Combo(),
                    comboIndex: 0,
                    hitSounds: [ 'hitnormal' ]
                })
            ];
        }

        function mouse1(mouseHistory, ox, oy) {
            mouseHistory.add(0,    { x: 360 + ox, y: 120 + oy, left: false, right: false });
            mouseHistory.add(800,  { x: 256 + ox, y: 192 + oy, left: false, right: false });
            mouseHistory.add(2300, { x: 256 + ox, y: 192 + oy, left: true,  right: false });
            mouseHistory.add(2500, { x: 256 + ox, y: 192 + oy, left: false, right: false });
        }

        function ruleSet1() {
            var ruleSet = new RuleSet();
            ruleSet.circleSize = 3;
            ruleSet.addTimingPoint(TimingPoint.generic());
            return ruleSet;
        }

        function objects2(ox, oy) {
            var combo = new Combo();

            return [
                util.extend(new mapObject.HitCircle(2000, 192 + ox, 128 + oy), {
                    combo: combo,
                    comboIndex: 0,
                    hitSounds: [ 'hitnormal' ]
                }),
                util.extend(new mapObject.HitCircle(4500, 320 + ox, 128 + oy), {
                    combo: combo,
                    comboIndex: 1,
                    hitSounds: [ 'hitnormal' ]
                }),
                util.extend(new mapObject.HitCircle(7000, 320 + ox, 256 + oy), {
                    combo: combo,
                    comboIndex: 2,
                    hitSounds: [ 'hitnormal' ]
                }),
                util.extend(new mapObject.HitCircle(9500, 192 + ox, 256 + oy), {
                    combo: combo,
                    comboIndex: 3,
                    hitSounds: [ 'hitnormal' ]
                })
            ];
        }

        function mouse2(mouseHistory, ox, oy) {
            var move = 800;
            var hold = 200;
            var wait = 700;

            var t = 0;

            mouseHistory.add(t, { x: 256 + ox, y: 192 + oy, left: false, right: false });
            t += move;
            mouseHistory.add(t, { x: 192 + ox, y: 128 + oy, left: false, right: false });
            t = 2000;
            mouseHistory.add(t, { x: 192 + ox, y: 128 + oy, left: true,  right: false });
            t += hold;
            mouseHistory.add(t, { x: 192 + ox, y: 128 + oy, left: false, right: false });
            t += wait;

            mouseHistory.add(t, { x: 192 + ox, y: 128 + oy, left: false, right: false });
            t += move;
            mouseHistory.add(t, { x: 320 + ox, y: 128 + oy, left: false, right: false });
            t = 4500;
            mouseHistory.add(t, { x: 320 + ox, y: 128 + oy, left: true,  right: false });
            t += hold;
            mouseHistory.add(t, { x: 320 + ox, y: 128 + oy, left: false, right: false });
            t += wait;

            mouseHistory.add(t, { x: 320 + ox, y: 128 + oy, left: false, right: false });
            t += move;
            mouseHistory.add(t, { x: 320 + ox, y: 256 + oy, left: false, right: false });
            t = 7000;
            mouseHistory.add(t, { x: 320 + ox, y: 256 + oy, left: true,  right: false });
            t += hold;
            mouseHistory.add(t, { x: 320 + ox, y: 256 + oy, left: false, right: false });
            t += wait;

            mouseHistory.add(t, { x: 320 + ox, y: 256 + oy, left: false, right: false });
            t += move;
            mouseHistory.add(t, { x: 192 + ox, y: 256 + oy, left: false, right: false });
            t = 9500;
            mouseHistory.add(t, { x: 192 + ox, y: 256 + oy, left: true,  right: false });
            t += hold;
            mouseHistory.add(t, { x: 192 + ox, y: 256 + oy, left: false, right: false });
            t += wait;
        }

        function ruleSet2() {
            var ruleSet = new RuleSet();
            ruleSet.circleSize = 3;
            ruleSet.addTimingPoint(TimingPoint.generic());
            return ruleSet;
        }

        function playHitMarker(hitMarker, ruleSet) {
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

        function mouseEasing(a, b, t) {
            return {
                x: ease.scale(a.x, b.x, ease.smoothstep(0, 1, t)),
                y: ease.scale(a.y, b.y, ease.smoothstep(0, 1, t)),
                left: a.left,
                right: a.right
            };
        }

        var sm = new TutorialStateMachine('none', {
            on_next: clearState,
            on_complete: clearState,

            enter_show_1: function () {
                var ruleSet = ruleSet1();
                ruleSet.getObjectStartAppearTime = function () {
                    return -Infinity;
                };
                ruleSet.getObjectEndAppearTime = function () {
                    return -Infinity;
                };

                var audio = new CoolAudio(null);
                var timeline = new Timeline(audio);
                var mapState = new MapState(ruleSet, objects1(0, 0), timeline);

                var mouseHistory = new History();
                mouseHistory.easing = mouseEasing;
                mouse1(mouseHistory, 0, 0);

                mapState.processMouseHistory(mouseHistory);

                timeline.add('next', null, 3500);
                timeline.subscribe('next', function () {
                    // End condition: user waited long enough
                    Q.fail(sm.next(), agentInfo.crash);
                });

                audio.seek(0);
                audio.play();

                timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                    playHitMarker(hitMarker, ruleSet);
                });

                renderCallback = function (renderer) {
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
                };
            },

            enter_play_1: function () {
                var ruleSet = ruleSet1();
                var audio = new CoolAudio(null);
                var timeline = new Timeline(audio);
                var mapState = new MapState(ruleSet, objects1(0, 0), timeline);
                var mouseHistory = new History();

                audio.seek(2300);

                var hintable = true;
                var showHint = false;

                var hintRuleSet = ruleSet1();
                hintRuleSet.getObjectStartAppearTime = function () {
                    return -Infinity;
                };
                hintRuleSet.getObjectEndAppearTime = function () {
                    return -Infinity;
                };

                var hintAudio = new CoolAudio(null);
                var hintTimeline = new Timeline(hintAudio);
                var hintMapState = new MapState(hintRuleSet, objects1(128, 0), hintTimeline);

                var hintMouseHistory = new History();
                hintMouseHistory.easing = mouseEasing;
                mouse1(hintMouseHistory, 128, 0);

                hintMapState.processMouseHistory(hintMouseHistory);

                function triggerHint() {
                    setTimeout(function () {
                        if (hintable) {
                            hintAudio.seek(0);
                            hintAudio.play();
                            showHint = true;
                        }
                    }, 5000);
                }

                triggerHint();
                hintTimeline.add('next', null, 3500);
                hintTimeline.subscribe('next', function () {
                    // Hint end condition: user waited long enough
                    showHint = false;
                    triggerHint();
                });

                boundEvents.push(mapState.events.hitMarker.subscribe(function (hitMarker) {
                    playHitMarker(hitMarker, ruleSet);

                    // End condition: hit marker created
                    hintable = false;
                    showHint = false;
                    audio.play();
                    setTimeout(function () {
                        sm.complete();
                    }, 1000);
                }));

                var isLeftDown = false, isRightDown = false;
                boundEvents.push(mousePubSub.subscribe(function (e) {
                    var time = audio.currentTime();

                    e = util.clone(e);
                    var pos = View.map.playfieldToView(e.x, e.y);
                    e.x = pos[0];
                    e.y = pos[1];

                    if (e.left && !isLeftDown || e.right && !isRightDown) {
                        mapState.clickAt(e.x, e.y, time);
                    }

                    isLeftDown = e.left;
                    isRightDown = e.right;
                }));

                renderCallback = function (renderer) {
                    var time;

                    renderer.renderColourOverlay([ 255, 255, 255, 255 ]);

                    if (showHint) {
                        time = hintAudio.currentTime();

                        renderer.renderMap({
                            ruleSet: hintRuleSet,
                            objects: hintMapState.getVisibleObjects(time),
                            skin: skin
                        }, time);
                        renderer.renderCursor({
                            mouseHistory: hintMouseHistory,
                            ruleSet: hintRuleSet,
                            skin: skin
                        }, time);

                        renderer.renderColourOverlay([ 0, 0, 0, 64 ]);
                    }

                    time = audio.currentTime();

                    renderer.renderMap({
                        ruleSet: ruleSet,
                        objects: mapState.getVisibleObjects(time),
                        skin: skin
                    }, time);
                    renderer.renderCurrentCursor({
                        ruleSet: ruleSet,
                        mouseHistory: mouseHistory,
                        skin: skin
                    }, time);
                };
            },

            enter_show_2: function () {
                var ruleSet = ruleSet2();
                ruleSet.getObjectStartAppearTime = function () {
                    return -Infinity;
                };
                ruleSet.getObjectEndAppearTime = function () {
                    return -Infinity;
                };

                var audio = new CoolAudio(null);
                var timeline = new Timeline(audio);
                var mapState = new MapState(ruleSet, objects2(0, 0), timeline);

                var mouseHistory = new History();
                mouseHistory.easing = mouseEasing;
                mouse2(mouseHistory, 0, 0);

                mapState.processMouseHistory(mouseHistory);

                timeline.add('next', null, 8500);
                timeline.subscribe('next', function () {
                    // End condition: user waited long enough
                    Q.fail(sm.next(), agentInfo.crash);
                });

                audio.seek(0);
                audio.play();

                timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                    playHitMarker(hitMarker, ruleSet);
                });

                renderCallback = function (renderer) {
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
                };
            }
        });

        return {
            render: function (renderer) {
                if (renderCallback) {
                    return renderCallback(renderer);
                } else {
                    return null;
                }

                var time;

                if (showHint) {
                    time = hintAudio.currentTime();

                    renderer.renderMap({
                        ruleSet: hintRuleSet,
                        objects: hintMapState.getVisibleObjects(time),
                        skin: skin
                    }, time);
                    renderer.renderCursor({
                        mouseHistory: hintMouseHistory,
                        ruleSet: hintRuleSet,
                        skin: skin
                    }, time);
                }

                time = audio.currentTime();

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
