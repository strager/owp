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
            var angle = Math.atan2(-(y - this.centre[1]), x - this.centre[0]);
            this.map.set(time, angle);
        },

        getRotationAtTime: function (time) {
            // Pretend we're moving left/right in a 1D Newtonian universe

            // Player's cursor's angle
            var playerPosition = Math.PI;

            // Position of the player's cursor at the time we press down the
            // mouse, so we can get absolute coordinates from the relative
            // mouse polar coordinates
            var downPosition = null;

            this.map.forEach(function (angle, angleTime) {
                if (angleTime > time) {
                    return false;
                }

                if (angle === null) {
                    // Mouse lifted
                    downPosition = null;
                } else {
                    if (downPosition === null) {
                        // Mouse just pressed
                        downPosition = playerPosition + angle;
                    } else {
                        // Mouse dragged
                        // TODO Handle wrapping (if diff is too big (sign change?), wrapped)
                        playerPosition = angle - downPosition;
                    }
                }
            });

            return playerPosition;
        }
    };

    return SpinnerHistory;
});
