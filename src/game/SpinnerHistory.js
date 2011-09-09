define('game/SpinnerHistory', [ 'util/SortedMap' ], function (SortedMap) {
    function SpinnerHistory() {
        this.map = new SortedMap();
        this.centre = [ 512 / 2, 384 / 2 ];
    }

    SpinnerHistory.prototype = {
        stop: function (time) {
            this.map.set(time, null);
        },

        move: function (time, x, y) {
            var angle = Math.atan2(y - this.centre[1], x - this.centre[0]);
            this.map.set(time, angle);
        },

        getRotationAtTime: function (time) {
            var rotationAngle = 0;
            var startAngle = null;
            var lastAngle = null;

            function end() {
                if (startAngle === null) {
                    return;
                }

                rotationAngle -= (lastAngle - startAngle);

                startAngle = null;
                lastAngle = null;
            }

            this.map.forEach(function (angle, angleTime) {
                if (angleTime > time) {
                    return false;
                }

                if (angle === null) {
                    // Mouse lifted
                    end();
                } else {
                    if (startAngle === null) {
                        // Mouse just pressed
                        startAngle = angle;
                    }

                    lastAngle = angle;
                }
            });

            end();

            return rotationAngle;
        }
    };

    return SpinnerHistory;
});
