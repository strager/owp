define('Util/PubSub', [ ], function () {
    return function () {
        var subscribers = [ ];

        return {
            publish: function (key) {
                var args = Array.prototype.slice.call(arguments, 1);

                subscribers.filter(function (subscriber) {
                    return subscriber && subscriber.key === key;
                }).forEach(function (subscriber) {
                    setTimeout(function () {
                        subscriber.callback.apply(null, args);
                    }, 0);
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
