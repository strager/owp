define('index', [ 'debugConsole', 'owp', 'agentInfo' ], function (debugConsole, owp, agentInfo) {
    var oldOnError = window.onerror;

    if (DEBUG) {
        agentInfo.crashHandler.subscribe(function (crashInfo) {
            console.error && console.error(crashInfo.exception.stack);
            throw crashInfo.exception;
        });
    } else {
        window.onerror = function (message, url, line) {
            try {
                if (typeof oldOnError === 'function') {
                    oldOnError.apply(this, arguments);
                }
            } catch (e) {
                // Ignore it.  We don't like them anyway.
            }

            try {
                agentInfo.crash([ message, url, line ]);
            } catch (e) {
                // Well fuck.  =\
                return true;
            }

            return false;
        };

        agentInfo.crashReportHandler.subscribe(function (report) {
            try {
                var notification = document.createElement('div');
                notification.className = 'notification error';
                notification.textContent = 'owp is having problems!  The issue has been reported to owp\'s developers.  Sorry for the inconvenience.';

                // Allow for CSS transitions
                notification.style.opacity = 0;
                setTimeout(function () {
                    try {
                        notification.style.opacity = 1;
                    } catch (e) {
                        // Whatever.
                    }
                }, 0);

                document.body.appendChild(notification);
            } catch (e) {
                // Whatever.
            }

            try {
                // If we get an error, oh well.
                var xhr = new XMLHttpRequest();

                xhr.open('POST', window.OWP_CRASH_URL, true);
                xhr.setRequestHeader('content-type', 'application/json');
                xhr.send(JSON.stringify(report));
            } catch (e) {
                // Not much we can do now but annoy the user.  And we don't
                // want that, do we?
            }
        });
    }

    agentInfo.userAgent = window.navigator.userAgent;
    agentInfo.location = window.location.toString();

    window.owp = owp;

    if (DEBUG) {
        debugConsole({
            debugInfo: function () {
                return owp.debugInfo();
            }
        });
    }
});
