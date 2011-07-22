DEBUG = true;

(function () {
    // Bullshit Require.js won't let us load scripts while *it* loads.
    var head = document.getElementsByTagName('head')[0];
    var script;

    script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.onload = function () {
        script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.onload = function () {
            require({
                baseUrl: 'src'
            }, [ ], function () {
                define('q', [ '../vendor/q/q' ], function (Q) {
                    return Q;
                });

                require([ '../index' ]);
            });
        };
        script.src = 'vendor/require.js';
        head.appendChild(script);
    };
    script.src = 'vendor/es5-shim.js';
    head.appendChild(script);
}());
