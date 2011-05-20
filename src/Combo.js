define('Combo', [ ], function () {
    var Combo = function (color) {
        // TODO Make nicer (color class?)

        this.color = color;

        if (!(color instanceof Array)) {
            color = [ 255, 255, 255 ];
        }

        color[0] = parseInt(color[0], 10);
        color[1] = parseInt(color[1], 10);
        color[2] = parseInt(color[2], 10);
    };

    return Combo;
});
