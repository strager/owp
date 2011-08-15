DEBUG = true;
VERSION = 'debug-build';

// =D?

document.write('<script src="vendor/es5-shim.js"></script>');
document.write('<script src="vendor/unrequirejs/lib/unrequire.js"></script>');
document.write('<script>(' + function () {
    require({
        baseUrl: 'src',
        aliases: {
            'q': '../vendor/q/q'
        }
    }, [ '../index' ], function () {
        // Load a debug map
        game.loadSkin('.');
        game.startMap('assets', 'map');
    });
} + '())</script>');
