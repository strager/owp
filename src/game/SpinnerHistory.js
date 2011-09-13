define('game/SpinnerHistory', [ 'util/History' ], function (History) {
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
        this.mouseHistory = new History();
        this.stateHistory = new History();
        this.centre = [ 512 / 2, 384 / 2 ];
    }

    SpinnerHistory.prototype = {
        stop: function (time) {
            this.mouseHistory.add(time, null);

            this.update(time);
        },

        move: function (time, x, y) {
            var angle = Math.atan2(-(y - this.centre[1]), x - this.centre[0]);
            this.mouseHistory.add(time, angle);

            this.update(time);
        },

        update: function (time) {
            // FIXME So hacky =[

            var stateIndex = this.stateHistory.map.getIndexForKey(time);
            var state;
            if (stateIndex === 0) {
                state = new SpinnerState(0);
            } else {
                state = this.stateHistory.map.values[stateIndex - 1];
            }

            // Remove future states, if any
            this.stateHistory.map.keys.splice(stateIndex, Infinity);
            this.stateHistory.map.values.splice(stateIndex, Infinity);

            // [Re]build state[s]
            var stateTime;
            var mouseDatas = this.mouseHistory.getHashBetweenTimes(state.time, time);
            for (stateTime in mouseDatas) {
                state = state.updated(mouseDatas[stateTime], +stateTime);
                this.stateHistory.add(+stateTime, state);
            }
        },

        getStateAtTime: function (time) {
            return this.stateHistory.getDataAtTime(time);
        }
    };

    return SpinnerHistory;
});
