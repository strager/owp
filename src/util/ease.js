define('util/ease', [ ], function () {
    function scale(a, b, value) {
        return value * (b - a) + a;
    }

    function lerp(a, b, value) {
        return Math.min(Math.max((value - a) / (b - a), 0), 1);
    }

    function smoothstep(a, b, value) {
        var x = lerp(a, b, value);
        return x * x * x * (x * (x * 6 - 15) + 10);
    }

    function table(interp, tab, value) {
        if (tab[0][0] >= value) {
            return tab[0][1];
        }

        var i;
        for (i = 1; i < tab.length; ++i) {
            var cur = tab[i];
            if (tab[i][0] >= value) {
                var last = tab[i - 1];
                return scale(last[1], cur[1], interp(last[0], cur[0], value));
            }
        }

        return tab[tab.length - 1][1];
    }

    return {
        scale: scale,
        lerp: lerp,
        smoothstep: smoothstep,
        table: table
    }
});
