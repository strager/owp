define('tutorial/Tutorial', [ 'q', 'Soundboard', 'game/RuleSet', 'game/Map', 'util/PubSub', 'util/StateMachine', 'agentInfo', 'game/Combo', 'game/mapObject' ], function (Q, Soundboard, RuleSet, Map, PubSub, StateMachine, agentInfo, Combo, mapObject) {
    var TutorialStateMachine = StateMachine.create([
        { name: 'start', from: 'none',   to: 'part_1' },

        { name: 'next',  from: 'part_1',      to: 'part_2'      },
        { name: 'next',  from: 'part_1_hint', to: 'part_2'      },
        { name: 'hint',  from: 'part_1',      to: 'part_1_hint' }
    ]);

    function Tutorial(skin) {
        var mousePubSub = new PubSub();

        var map = null, hintMap = null;
        var ruleSet = null, hintRuleSet = null;
        var mouseHistory = null;

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
                map = null;
                ruleSet = null;

                hintMap = map;
                hintRuleSet = ruleSet;
            },

            on_next: function () {
                map = null;
                ruleSet = null;

                hintMap = null;
                hintRuleSet = null;;
            },

            enter_part_1: function () {
                var combo = new Combo();

                map = new Map();

                var o = new mapObject.HitCircle(0, 32, 32)
                o.combo = combo;
                o.comboIndex = 0;
                map.objects.push(o);

                ruleSet = new RuleSet();
            },
        });

        return {
            render: function (renderer) {
                if (map && ruleSet) {
                    var time = 0;

                    renderer.renderMap({
                        ruleSet: ruleSet,
                        objects: map.objects,
                        skin: skin
                    }, time);
                }
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
