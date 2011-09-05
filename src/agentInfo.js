define('agentInfo', [ 'util/PubSub', 'util/util' ], function (PubSub, util) {
    var agentInfo = { };

    agentInfo.crashHandler = new PubSub();
    agentInfo.crash = function (exception) {
        var crashInfo = util.clone(agentInfo);
        crashInfo.exception = exception;
        crashInfo.date = +new Date();

        delete crashInfo.crash;
        delete crashInfo.crashHandler;
        delete crashInfo.crashReportHandler;
        delete crashInfo.catchAll;

        agentInfo.crashHandler.publishSync(crashInfo);
    };

    agentInfo.crashReportHandler = new PubSub();
    var crashes = [ ];
    var maxCrashCount = 10;
    var crashTimer = null;
    var crashTimeout = 2000;
    agentInfo.crashHandler.subscribe(function (crashInfo) {
        if (crashes.length >= maxCrashCount) {
            // Ignore crashes over maxCrashCount because we are probably
            // getting spammed.
            return;
        }

        crashes.push(crashInfo);

        if (crashTimer) {
            window.clearTimeout(crashTimer);
        }

        crashTimer = setTimeout(function () {
            agentInfo.crashReportHandler.publishSync({
                version: VERSION,
                crashes: crashes
            });
        }, crashTimeout);
    });

    agentInfo.catchAll = function catchAll(callback) {
        if (DEBUG) {
            return callback;
        } else {
            return function () {
                try {
                    callback.apply(this, arguments);
                } catch (e) {
                    agentInfo.crash(e);
                }
            };
        }
    };

    return agentInfo;
});
