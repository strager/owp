define('Util/gPubSub', [ 'Util/PubSub' ], function (PubSub) {
    var secret = 'gpubsub';

    var events = new PubSub();

    window.addEventListener('message', function (event) {
        if (event.source !== window) {
            return;
        }

        var data;

        try {
            data = JSON.parse(event.data);
        } catch (e) {
            // Ignore non-JSON data
            return;
        }

        if (data.secret !== secret) {
            return;
        }

        events.publishSync.apply(
            events,
            event.data.args
        );

        event.preventDefault();
        return false;
    }, false);

    return {
        publish: function () {
            var args = Array.prototype.slice.call(arguments, 1);
            var data = JSON.stringify({ secret: secret, args: args });

            window.postMessage(data, '*');
        },

        subscribe: function (callback) {
            return events.subscribe(callback);
        }
    };
});
