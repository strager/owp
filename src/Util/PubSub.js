define('Util/PubSub', [ ], function () {
    return function () {
        var subscribers = [ ];

        var getSubscribers = function (key) {
            return subscribers.filter(function (subscriber) {
                return subscriber && subscriber.key === key;
            });
        };

        return {
            publish: function (key) {
                var args = Array.prototype.slice.call(arguments, 1);

                getSubscribers(key).forEach(function (subscriber) {
                    setTimeout(function () {
                        subscriber.callback.apply(null, args);
                    }, 0);
                });
            },

            publishSync: function (key) {
                var args = Array.prototype.slice.call(arguments, 1);

                getSubscribers(key).forEach(function (subscriber) {
                    subscriber.callback.apply(null, args);
                });
            },

            subscribe: function (key, callback) {
                var index = subscribers.length;

                subscribers.push({ key: key, callback: callback });

                return {
                    unsubscribe: function () {
                        delete subscribers[index];
                    }
                };
            }
        };
    };
});
