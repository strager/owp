(function () {
    var assert = require('assert');
    var RuleSet = require('owp/RuleSet').$;

    exports.testGetObjectStateAtTime_before = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;

        var object = { time: 1000 };

        assert.deepEqual({
            visibility: 'before',
            progress: 0
        }, ruleSet.getObjectStateAtTime(object, 0), '0ms');

        assert.deepEqual({
            visibility: 'before',
            progress: 0
        }, ruleSet.getObjectStateAtTime(object, 899), '899ms');
    };

    exports.testGetObjectStateAtTime_appearing = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;

        var object = { time: 1000 };

        assert.deepEqual({
            visibility: 'appearing',
            progress: 0
        }, ruleSet.getObjectStateAtTime(object, 900), '900ms');

        assert.deepEqual({
            visibility: 'appearing',
            progress: 0.5
        }, ruleSet.getObjectStateAtTime(object, 950), '950ms');
    };

    exports.testGetObjectStateAtTime_during = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;
        ruleSet.disappearTime = 50;

        var object = { time: 1000, duration: 1 };

        assert.deepEqual({
            visibility: 'during',
            progress: 0
        }, ruleSet.getObjectStateAtTime(object, 1000), '1000ms');
    };

    exports.testGetObjectStateAtTime_disappearing = function () {
        var ruleSet = new RuleSet();
        ruleSet.disappearTime = 50;

        var object = { time: 1000 };

        assert.deepEqual({
            visibility: 'disappearing',
            progress: 0
        }, ruleSet.getObjectStateAtTime(object, 1000), '1000ms');

        assert.deepEqual({
            visibility: 'disappearing',
            progress: 0.02
        }, ruleSet.getObjectStateAtTime(object, 1001), '1001ms');

        assert.deepEqual({
            visibility: 'disappearing',
            progress: 1
        }, ruleSet.getObjectStateAtTime(object, 1050), '1050ms');
    };

    exports.testGetObjectStateAtTime_after = function () {
        var ruleSet = new RuleSet();
        ruleSet.disappearTime = 50;

        var object = { time: 1000 };

        assert.deepEqual({
            visibility: 'after',
            progress: 0
        }, ruleSet.getObjectStateAtTime(object, 1051), '1051ms');
    };
}());
