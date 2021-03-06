define([ 'assert', 'assetConfig' ], function (assert, assetConfig) {
    var exports = { };

    exports.testParseSectionlessData = function () {
        var data = assetConfig.parseString('osu file format v2\n\nfoobar');

        assert.deepEqual([
            'osu file format v2',
            'foobar'
        ], data.global.lines);
    };

    exports.testParseSection = function () {
        var data = assetConfig.parseString('[Section]\nabc: def\n[Test\n]same section\n[Test] again\nyay');

        assert.deepEqual([
            'abc: def',
            '[Test',
            ']same section',
            '[Test] again',
            'yay'
        ], data.Section.lines);
    };

    exports.testParseSections = function () {
        var data = assetConfig.parseString('[Section A]\na data\n[Section B]\nb data\n');

        assert.deepEqual([
            'a data'
        ], data['Section A'].lines);

        assert.deepEqual([
            'b data'
        ], data['Section B'].lines);
    };

    exports.testParseValues = function () {
        var data = assetConfig.parseString('a: b\nc:d\n  e :f : :: :F ');

        assert.deepEqual({
            a: 'b',
            c: 'd',
            e: 'f : :: :F'
        }, data.global.values);
    };

    exports.testParseLists = function () {
        var data = assetConfig.parseString('1,2,3\n4:2,5,6,8\n   2,1, ');

        assert.deepEqual([
            [ '1', '2', '3' ],
            [ '4:2', '5', '6', '8' ],
            [ '   2', '1', ' ' ]
        ], data.global.lists);
    };

    return exports;
});
