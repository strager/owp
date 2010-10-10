(function () {
    var assert = require('assert');
    var RuleSet = require('owp/RuleSet').$;

    var appearTime = 1200;
    var disappearTime = 150;

    exports.testGetObjectVisibilityAtTime_before = function () {
        var ruleSet = new RuleSet();
        ruleSet.approachRate = 5;

        var object = { time: 10000 };

        assert.equal('before', ruleSet.getObjectVisibilityAtTime(object, 0));
        assert.equal('before', ruleSet.getObjectVisibilityAtTime(object, 10000 - appearTime - 1));
    };

    exports.testGetObjectVisibilityAtTime_appearing = function () {
        var ruleSet = new RuleSet();
        ruleSet.approachRate = 5;

        var object = { time: 10000 };

        assert.equal('appearing', ruleSet.getObjectVisibilityAtTime(object, 10000 - appearTime));
        assert.equal('appearing', ruleSet.getObjectVisibilityAtTime(object, 10000 - 1));
    };

    exports.testGetObjectVisibilityAtTime_during = function () {
        var ruleSet = new RuleSet();
        ruleSet.approachRate = 5;

        var object = { time: 10000, duration: 1 };

        assert.equal('during', ruleSet.getObjectVisibilityAtTime(object, 10000));
    };

    exports.testGetObjectVisibilityAtTime_disappearing = function () {
        var ruleSet = new RuleSet();
        ruleSet.overallDifficulty = 5;

        var object = { time: 10000 };

        assert.equal('disappearing', ruleSet.getObjectVisibilityAtTime(object, 10000));
        assert.equal('disappearing', ruleSet.getObjectVisibilityAtTime(object, 10001));
        assert.equal('disappearing', ruleSet.getObjectVisibilityAtTime(object, 10000 + disappearTime - 1));
    };

    exports.testGetObjectVisibilityAtTime_after = function () {
        var ruleSet = new RuleSet();
        ruleSet.overallDifficulty = 5;

        var object = { time: 10000 };

        assert.equal('after', ruleSet.getObjectVisibilityAtTime(object, 10000 + disappearTime));
        assert.equal('after', ruleSet.getObjectVisibilityAtTime(object, 10001 + disappearTime));
    };
}());
