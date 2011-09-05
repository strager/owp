define('debugConsole', [ 'util/FramerateCounter', 'util/util' ], function (FramerateCounter, util) {
    return function debugConsole(options) {
        function getPaintCount() {
            return window.mozPaintCount || 0;
        }

        var lastPaintCount = 0;
        var paintFps = new FramerateCounter();

        function debugInfo() {
            var currentPaintCount = getPaintCount();
            paintFps.addTicks(currentPaintCount - lastPaintCount);
            lastPaintCount = currentPaintCount;

            return util.clone({
                'paint fps': paintFps.framerate
            }, options.debugInfo());
        }

        function updateDebugInfo() {
            var debugElement = document.getElementById('debug');

            if (!debugElement) {
                return;
            }

            var debug = debugInfo();

            var text = Object.keys(debug).map(function (key) {
                var value = debug[key];

                if (typeof value === 'number') {
                    value = value.toFixed(2);
                }

                return key + ': ' + value;
            }).join('\n');

            debugElement.textContent = text;
        }

        window.setInterval(updateDebugInfo, 100);
    };
});
