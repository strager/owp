(function () {
    var assert = require('assert');
    var RuleSet = require('owp/RuleSet').$;

    exports.testGetObjectVisibilityAtTime_before = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;

        var object = { time: 1000 };

        assert.equal('before', ruleSet.getObjectVisibilityAtTime(object, 0), '0ms');
        assert.equal('before', ruleSet.getObjectVisibilityAtTime(object, 899), '899ms');
    };

    exports.testGetObjectVisibilityAtTime_appearing = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;

        var object = { time: 1000 };

        assert.equal('appearing', ruleSet.getObjectVisibilityAtTime(object, 900), '900ms');
        assert.equal('appearing', ruleSet.getObjectVisibilityAtTime(object, 950), '950ms');
    };

    exports.testGetObjectVisibilityAtTime_during = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;
        ruleSet.disappearTime = 50;

        var object = { time: 1000, duration: 1 };

        assert.equal('during', ruleSet.getObjectVisibilityAtTime(object, 1000), '1000ms');
    };

    exports.testGetObjectVisibilityAtTime_disappearing = function () {
        var ruleSet = new RuleSet();
        ruleSet.disappearTime = 50;

        var object = { time: 1000 };

        assert.equal('disappearing', ruleSet.getObjectVisibilityAtTime(object, 1000), '1000ms');
        assert.equal('disappearing', ruleSet.getObjectVisibilityAtTime(object, 1001), '1001ms');
        assert.equal('disappearing', ruleSet.getObjectVisibilityAtTime(object, 1049), '1049ms');
    };

    exports.testGetObjectVisibilityAtTime_after = function () {
        var ruleSet = new RuleSet();
        ruleSet.disappearTime = 50;

        var object = { time: 1000 };

        amsssert.equal('after', ruleSet.getObjectVisibilityAtTime(object, 1050), '1050ms');
        assert.equal('after', ruleSet.getObjectVisibilityAtTime(object, 1051), '1051ms');
    };
}());
