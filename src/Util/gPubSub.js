define('Util/gPubSub', [ 'Util/PubSub' ], function (PubSub) {
    var secret = 'gpubsub';
    var secretRe = /^gpubsub/;
    var secretLength = secret.length;

    var events = new PubSub();

    function serialize(args) {
        return secret + args.join(',');
    }

    function deserialize(string) {
        if (!secretRe.test(string)) {
            return null;
        }

        return string.substr(secretLength).split(',');
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window) {
            return;
        }

        var data = deserialize(event.data);

        if (!data) {
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
            var data = serialize(args);

            window.postMessage(data, '*');
        },

        subscribe: function (callback) {
            return events.subscribe(callback);
        }
    };
});
