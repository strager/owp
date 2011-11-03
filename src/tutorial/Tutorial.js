define('tutorial/Tutorial', [ 'q', 'Soundboard', 'game/RuleSet', 'game/MapState', 'util/PubSub', 'util/StateMachine', 'agentInfo', 'game/Combo', 'game/mapObject', 'util/History', 'util/ease', 'util/CoolAudio', 'util/Timeline', 'util/util', 'game/TimingPoint' ], function (Q, Soundboard, RuleSet, MapState, PubSub, StateMachine, agentInfo, Combo, mapObject, History, ease, CoolAudio, Timeline, util, TimingPoint) {
    var TutorialStateMachine = StateMachine.create([
        { name: 'start', from: 'none',   to: 'part_1' },

        { name: 'next',  from: 'part_1',      to: 'part_2'      },
        { name: 'next',  from: 'part_1_hint', to: 'part_2'      },
        { name: 'hint',  from: 'part_1',      to: 'part_1_hint' }
    ]);

    function Tutorial(skin) {
        var mousePubSub = new PubSub();

        var mapState = null, hintMapState = null;
        var ruleSet = null, hintRuleSet = null;
        var mouseHistory = null, hintMouseHistory = null;
        var audio = null, hintAudio = null;
        var timeline = null, hintTimeline = null;

        var trackMouse = false;

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
            on_hint: function () {
                hintMapState = mapState;
                hintRuleSet = ruleSet;
                hintMouseHistory = mouseHistory;
                hintAudio = audio;

                mapState = null;
                ruleSet = null;
                mouseHistory = null;
                audio = null;
            },

            on_next: function () {
                hintMapState = null;
                hintRuleSet = null;
                hintMouseHistory = null;
                hintAudio = null;

                mapState = null;
                ruleSet = null;
                mouseHistory = null;
                audio = null;
            },

            enter_part_1: function () {
                var objects = [
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
                mapState = new MapState(ruleSet, objects, timeline);

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

                boundEvents.push(timeline.subscribe(MapState.HIT_MARKER_CREATION, function (hitMarker) {
                    playHitMarker(hitMarker);
                }));
            },
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
