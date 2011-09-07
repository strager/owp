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
            this.map.set(time, [ x, y ]);
        },

        getRotationAtTime: function (time) {
            var cx = this.centre[0];
            var cy = this.centre[1];

            var angle = 0;
            var start = null;
            var last = null;

            function end() {
                if (!start) {
                    return;
                }

                var startAngle = Math.atan2(start[1] - cy, start[0] - cx);
                var endAngle = Math.atan2(last[1] - cy, last[0] - cx);

                angle -= (endAngle - startAngle);

                start = null;
                last = null;
            }

            this.map.forEach(function (point, pointTime) {
                if (pointTime > time) {
                    return false;
                }

                if (point) {
                    if (!start) {
                        start = point;
                    }

                    last = point;
                } else {
                    end();
                }
            });

            end();

            return angle;
        }
    };

    return SpinnerHistory;
});
