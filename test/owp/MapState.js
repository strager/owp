(function () {
    var assert = require('assert');
    var Map = require('owp/Map').$;
    var MapState = require('owp/MapState').$;
    var RuleSet = require('owp/RuleSet').$;

    exports.testGetVisibleObjects_before = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;

        var map = new Map(ruleSet);
        map.objects.push({ time: 1000 });

        var ms = new MapState(map);

        assert.equal(0, ms.getVisibleObjects(0).length, '0ms');
        assert.equal(0, ms.getVisibleObjects(899).length, '899ms');
    };

    exports.testGetVisibleObjects_during = function () {
        var ruleSet = new RuleSet();
        ruleSet.appearTime = 100;
        ruleSet.disappearTime = 50;

        var map = new Map(ruleSet);
        map.objects.push({ time: 1000 });

        var ms = new MapState(map);

        assert.equal(1, ms.getVisibleObjects(900).length, '900ms');
        assert.equal(1, ms.getVisibleObjects(1000).length, '1000ms');
        assert.equal(1, ms.getVisibleObjects(1050).length, '1050ms');
    };

    exports.testGetVisibleObjects_after = function () {
        var ruleSet = new RuleSet();
        ruleSet.disappearTime = 50;

        var map = new Map(ruleSet);
        map.objects.push({ time: 1000 });

        var ms = new MapState(map);

        assert.equal(0, ms.getVisibleObjects(1051).length, '1051ms');
        assert.equal(0, ms.getVisibleObjects(2000).length, '2000ms');
    };
}());
