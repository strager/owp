define('Util/util', [ ], function () {
    function fitRectangleScale(containerW, containerH, innerW, innerH) {
        var containerAR = containerW / containerH;
        var innerAR = innerW / innerH;

        var ratio = innerAR;
        var target_ratio = containerAR;

        if (ratio > target_ratio) {
            return containerW / ratio / innerH;
        } else {
            return containerH  * ratio / innerW;
        }
    }

    function fitRectangle(containerW, containerH, innerW, innerH) {
        var scale = fitRectangleScale(containerW, containerH, innerW, innerH);
        var width = innerW * scale;
        var height = innerH * scale;

        var x = (containerW - width) / 2;
        var y = (containerH - width) / 2;

        return {
            width: width,
            height: height,
            x: x,
            y: y
        };
    }

    function extendObjectWithFields(base, fields, extension) {
        var i, arg, field;

        for (i = 0; i < fields.length; ++i) {
            field = fields[i];

            for (arg = 2 /* extension */; arg < arguments.length; ++arg) {
                if (Object.prototype.hasOwnProperty.call(arguments[arg], field)) {
                    base[field] = arguments[arg][field];
                }
            }
        }

        return base;
    }

    return {
        fitRectangleScale: fitRectangleScale,
        fitRectangle: fitRectangle,
        extendObjectWithFields: extendObjectWithFields
    };
});
