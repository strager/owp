define('util/gPubSub', [ 'util/PubSub' ], function (PubSub) {
    var secret = 'gpubsub';

    var events = new PubSub();

    var lastPub = 0;
    var PUBLISH_THRESHOLD = 2; // Minimum ms between publishes

    window.addEventListener('message', function (event) {
        if (event.source !== window) {
            return;
        }

        if (event.data === secret) {
            events.publishSync();

            event.preventDefault();
            return false;
        }
    }, false);

    return {
        publish: function () {
            var now = Date.now();

            if (lastPub + PUBLISH_THRESHOLD >= now) {
                return;
            }

            lastPub = now;

            window.postMessage(secret, '*');
        },

        subscribe: function (callback) {
            return events.subscribe(callback);
        }
    };
});
