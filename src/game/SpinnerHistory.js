define('game/SpinnerHistory', [ 'util/SortedMap' ], function (SortedMap) {
    function SpinnerState(time) {
        // Pretend we're moving left/right in a 1D Newtonian universe

        // Player's cursor's angle
        this.playerPosition = 0;

        // Position of the player's cursor at the time we press down the
        // mouse, so we can get absolute coordinates from the relative
        // mouse polar coordinates
        this.downPosition = null;

        this.time = time;
    }

    SpinnerState.prototype = {
        getRotation: function () {
            return this.playerPosition;
        },

        extrapolated: function (newTime) {
            return this;
        },

        updated: function (angle, angleTime) {
            if (angleTime < this.time) {
                throw new Error('Can\'t update in the past');
            }

            var newState = new SpinnerState(angleTime);
            newState.playerPosition = this.playerPosition;
            newState.downPosition = this.downPosition;

            if (angle === null) {
                // Mouse lifted
                newState.downPosition = null;
            } else {
                if (this.downPosition === null) {
                    // Mouse just pressed
                    newState.downPosition = this.playerPosition + angle;
                } else {
                    // Mouse dragged
                    // TODO Handle wrapping (if diff is too big (sign change?), wrapped)
                    newState.playerPosition = angle - this.downPosition;
                }
            }

            return newState;
        }
    };

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

        getStateAtTime: function (time) {
            var state = new SpinnerState(0);

            this.map.forEach(function (angle, angleTime) {
                if (angleTime > time) {
                    return false;
                }

                state = state.updated(angle, angleTime);
            });

            return state;
        }
    };

    return SpinnerHistory;
});
