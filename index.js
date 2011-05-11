require([ 'jQuery', 'CanvasRenderer', 'RuleSet', 'Map', 'MapState', 'HitCircle', 'Skin', 'AssetManager', 'q' ], function ($, CanvasRenderer, RuleSet, Map, MapState, HitCircle, Skin, AssetManager, Q) {
    var mapAssetManager = new AssetManager('assets');
    var skinAssetManager = new AssetManager('.');

    var render = function (time, renderer, skin, mapInfo, mapState, mapAssetManager) {
        renderer.beginRender();
        renderer.renderStoryboard(mapInfo.storyboard, mapAssetManager, time);
        renderer.renderMap(mapState, skin, time);
        renderer.endRender();
    };

    var init = function () {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        $(canvas).appendTo(document.body);

        var canvasRenderer = new CanvasRenderer(canvas.getContext('2d'));

        return {
            renderer: canvasRenderer,
            playArea: canvas
        };
    };

    var preload = function () {
        var audio;
        var skin;
        var mapState;
        var mapInfo;

        return Q.shallow([
            Q.when(mapAssetManager.load('map', 'map'))
                .then(function (mapInfo_) {
                    mapInfo = mapInfo_;
                    mapState = MapState.fromMapInfo(mapInfo);

                    return Q.shallow([
                        mapAssetManager.load(mapInfo.audioFile, 'audio'),
                        mapInfo.storyboard.preload(mapAssetManager)
                    ]);
                })
                .then(function (r) {
                    audio = r[0];

                    audio.controls = 'controls';
                    document.body.appendChild(audio);

                    return audio;
                }),
            Q.when(skinAssetManager.load('skin', 'skin'))
                .then(function (skin_) {
                    skin = skin_;

                    return Q.when(skin_.preload());
                })
        ]).then(function () {
            return {
                audio: audio,
                skin: skin,
                mapState: mapState,
                mapInfo: mapInfo
            };
        });
    };

    var game = function (io, gameInfo) {
        var getMapTime = function () {
            return Math.round(io.audio.currentTime * 1000);
        };

        var renderLoop = function () {
            var time = getMapTime();

            render(time, io.renderer, gameInfo.skin, gameInfo.mapInfo, gameInfo.mapState, mapAssetManager);

            var renderInterval = 20;
            setTimeout(renderLoop, renderInterval);
        };

        io.audio.currentTime = 33; // XXX TEMP
        io.audio.play();

        renderLoop();

        $(io.playArea).click(function (e) {
            var x = e.pageX - this.offsetLeft;
            var y = e.pageY - this.offsetTop;

            gameInfo.mapState.makeHit(x, y, getMapTime());
        });
    };

    $(function () {
        Q.shallow([
            init(),
            preload()
        ]).then(function (r) {
            var io = {
                renderer: r[0].renderer,
                audio: r[1].audio,
                playArea: r[0].playArea
            };

            var gameInfo = {
                skin: r[1].skin,
                mapState: r[1].mapState,
                mapInfo: r[1].mapInfo
            };

            game(io, gameInfo);
        });
    });
});
