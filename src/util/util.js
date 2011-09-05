define('util/util', [ ], function () {
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

    function extend(obj /* extensions... */) {
        var i;

        for (i = 0; i < arguments.length; ++i) {
            var extension = arguments[i];
            Object.keys(extension).forEach(function (key) {
                obj[key] = extension[key];
            });
        }

        return obj;
    }

    function clone(obj) {
        return extend({ }, obj);
    }

    function setCursorImage(element, src, centreX, centreY) {
        if (typeof window.opera !== 'undefined' && Object.prototype.toString.call(window.opera) === '[object Opera]') {
            // Opera doesn't support mouse cursor images
            // TODO Do something serious about this
            element.style.cursor = 'crosshair';
        } else {
            element.style.cursor = 'url(' + JSON.stringify(src) + ') ' + Math.floor(centreX) + ' ' + Math.floor(centreY) + ', none';
        }
    }

    return {
        fitRectangleScale: fitRectangleScale,
        fitRectangle: fitRectangle,
        extendObjectWithFields: extendObjectWithFields,
        extend: extend,
        clone: clone,
        setCursorImage: setCursorImage
    };
});
