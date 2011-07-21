DEBUG = true;

(function () {
    var loadedCount = 0;

    function loaded() {
        ++loadedCount;

        if (loadedCount >= 2) {
            require({
                baseUrl: 'src'
            }, [ ], function () {
                define('q', [ '../vendor/q/q' ], function (Q) {
                    return Q;
                });

                require([ '../index' ]);
            });
        }
    }

    var head = document.getElementsByTagName('head')[0];
    var script;

    script = document.createElement('script');
    script.onload = loaded;
    //script.async = true;
    //script.defer = true;
    script.src = 'vendor/es5-shim.js';
    head.appendChild(script);

    script = document.createElement('script');
    script.onload = loaded;
    //script.async = true;
    //script.defer = true;
    script.src = 'vendor/require.js';
    head.appendChild(script);
}());
