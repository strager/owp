DEBUG = true;
VERSION = 'debug-build';

// =D?

OWP_ROOT = '/';

document.write('<script src="' + OWP_ROOT + 'vendor/es5-shim.js"></script>');
document.write('<script src="' + OWP_ROOT + 'vendor/unrequirejs/lib/unrequire.js"></script>');
document.write('<script>(' + function () {
    require({
        baseUrl: OWP_ROOT + 'src',
        aliases: {
            'q': '../vendor/q/q'
        }
    }, [ '../index' ], function () {
        // Load a debug map
        owp.init(document.getElementById('playfield'));
        owp.game.loadSkin('.');
        owp.game.startMap('assets', 'map');
    });
} + '())</script>');
