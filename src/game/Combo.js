define('game/Combo', [ ], function () {
    function Combo(color) {
        // TODO Make nicer (color class?)

        if (!(color instanceof Array)) {
            color = [ 255, 255, 255 ];
        }

        color[0] = parseInt(color[0], 10);
        color[1] = parseInt(color[1], 10);
        color[2] = parseInt(color[2], 10);

        this.color = color;
    }

    return Combo;
});
