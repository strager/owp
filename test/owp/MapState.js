(function () {
    var assert = require('assert');
    var Map = require('owp/Map').$;
    var MapState = require('owp/MapState').$;
    var RuleSet = require('owp/RuleSet').$;

    var appearTime = 1200;

    exports.testGetVisibleObjects_before = function () {
        var ruleSet = new RuleSet();
        ruleSet.approachRate = 5;

        var ms = new MapState(ruleSet, [ { time: 10000 } ]);

        assert.equal(0, ms.getVisibleObjects(0).length, '0ms');
        assert.equal(0, ms.getVisibleObjects(10000 - appearTime - 1).length, 'Just before appearance');
    };

    exports.testGetVisibleObjects_during = function () {
        var ruleSet = new RuleSet();
        ruleSet.approachRate = 5;

        var ms = new MapState(ruleSet, [ { time: 10000 } ]);

        assert.equal(1, ms.getVisibleObjects(10000 - appearTime).length, 'Just at appearance');
        assert.equal(1, ms.getVisibleObjects(10000).length, 'Just at start time');
    };

    exports.testGetVisibleObjects_after = function () {
        var ruleSet = new RuleSet();
        ruleSet.approachRate = 5;

        var ms = new MapState(ruleSet, [ { time: 10000 } ]);

        assert.equal(0, ms.getVisibleObjects(10050).length, 'Just at disappearance');
        assert.equal(0, ms.getVisibleObjects(10051).length, 'Just after disappearance');
        assert.equal(0, ms.getVisibleObjects(90000).length, 'Over 90000ms');
    };
}());
