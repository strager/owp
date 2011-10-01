define('game/Skin', [ 'util/util' ], function (util) {
    function Skin(assetManager) {
        this.assetManager = assetManager;
    }

    Skin.fromSettings = function (assetManager, settings) {
        var skin = new Skin(assetManager);

        var fields = (
            'name,author,' +
            'comboColors,spinnerApproachCircleColor,sliderBorderColor,' +
            'scoreFontSpacing,hitCircleFontSpacing,' +
            'sliderBallFlips,sliderBallFrames,cursorExpands'
        ).split(',');

        util.extendObjectWithFields(skin, fields, settings);

        return skin;
    };

    Skin.prototype = {
        preload: function () {
            // Try to keep this in sync with bin/skin.php
            var files = {
                'image': [
                    'hitcircle.png',
                    'approachcircle.png',
                    'hitcircleoverlay.png',
                    'cursor.png',
                    'cursortrail.png',
                    'hit0.png',
                    'hit50.png',
                    'hit100.png',
                    'hit100k.png',
                    'hit300k.png',
                    'hit300.png',
                    'sliderscorepoint.png',
                    'sliderpoint30.png',
                    'sliderpoint10.png',
                    'reversearrow.png',
                    'sliderb0.png',

                    'ranking-a-small.png',
                    'ranking-a.png',
                    'ranking-b-small.png',
                    'ranking-b.png',
                    'ranking-c.png',
                    'ranking-d-small.png',
                    'ranking-d.png',
                    'ranking-s-small.png',
                    'ranking-s.png',
                    'ranking-sh-small.png',
                    'ranking-sh.png',
                    'ranking-accuracy.png',
                    'ranking-back.png',
                    'ranking-c-small.png',
                    'ranking-graph.png',
                    'ranking-maxcombo.png',
                    'ranking-panel.png',
                    'ranking-perfect.png',
                    'ranking-replay.png',
                    'ranking-retry.png',
                    'ranking-title.png',
                    'ranking-x-small.png',
                    'ranking-x.png',
                    'ranking-xh-small.png',
                    'ranking-xh.png',

                    'default-0.png',
                    'default-1.png',
                    'default-2.png',
                    'default-3.png',
                    'default-4.png',
                    'default-5.png',
                    'default-6.png',
                    'default-7.png',
                    'default-8.png',
                    'default-9.png',
                    'default-comma.png',
                    'default-dot.png',

                    'score-0.png',
                    'score-1.png',
                    'score-2.png',
                    'score-3.png',
                    'score-4.png',
                    'score-5.png',
                    'score-6.png',
                    'score-7.png',
                    'score-8.png',
                    'score-9.png',
                    'score-comma.png',
                    'score-dot.png',
                    'score-percent.png',
                    'score-x.png',

                    'ready-to-play.png'
                ],
                'sound': [
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
                    'soft-slidertick.wav',

                    'spinnerbonus.wav',
                    'spinnerspin.wav',

                    'menuback.wav',
                    'menuclick.wav',
                    'menuhit.wav'
                ]
            };

            return this.assetManager.archivedPreload('skin.owpa', files);
        }
    };

    return Skin;
});
