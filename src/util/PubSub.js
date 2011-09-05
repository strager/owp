define('util/PubSub', [ ], function () {
    return function () {
        var subscribers = [ ];

        return {
            publish: function () {
                var args = Array.prototype.slice.call(arguments);

                subscribers.forEach(function (subscriber) {
                    if (!subscriber) {
                        return;
                    }

                    setTimeout(function () {
                        subscriber.apply(null, args);
                    }, 0);
                });
            },

            publishSync: function () {
                var args = Array.prototype.slice.call(arguments);

                subscribers.forEach(function (subscriber) {
                    if (!subscriber) {
                        return;
                    }

                    subscriber.apply(null, args);
                });
            },

            subscribe: function (callback) {
                var index = subscribers.length;
                subscribers.push(callback);

                return {
                    unsubscribe: function () {
                        delete subscribers[index];
                    }
                };
            }
        };
    };
});
