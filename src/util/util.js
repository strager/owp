define('util/util', [ 'util/Cache' ], function (Cache) {
    function fitRectangleScale(containerW, containerH, innerW, innerH) {
        var containerAR = containerW / containerH;
        var innerAR = innerW / innerH;

        var ratio = innerAR;
        var target_ratio = containerAR;

        if (ratio > target_ratio) {
            return containerW / ratio / innerH;
        } else {
            return containerH * ratio / innerW;
        }
    }

    function fitOuterRectangleScale(containerW, containerH, innerW, innerH) {
        var containerAR = containerW / containerH;
        var innerAR = innerW / innerH;

        var ratio = innerAR;
        var target_ratio = containerAR;

        if (ratio > target_ratio) {
            return containerH * ratio / innerW;
        } else {
            return containerW / ratio / innerH;
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

    function fitOuterRectangle(containerW, containerH, innerW, innerH) {
        var scale = fitOuterRectangleScale(containerW, containerH, innerW, innerH);
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

    function roundRectangle(rectangle) {
        var x = Math.floor(rectangle.x);
        var y = Math.floor(rectangle.y);

        return {
            width: Math.ceil(rectangle.x + rectangle.width) - x,
            height: Math.ceil(rectangle.y + rectangle.height) - y,
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
        var i, extension;

        function extendProperty(key) {
            obj[key] = extension[key];
        }

        for (i = 1; i < arguments.length; ++i) {
            extension = arguments[i];
            Object.keys(extension || { }).forEach(extendProperty);
        }

        return obj;
    }

    function clone(obj /* extensions... */) {
        var args = Array.prototype.slice.call(arguments);
        return extend.apply(null, [ { } ].concat(args));
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

    function memoize(fn) {
        var cache = new Cache();

        return function () {
            var args = arguments;
            var self = this;
            var cargs = [ self ].concat(Array.prototype.slice.call(args));

            return cache.get(cargs, function () {
                return fn.apply(self, args);
            });
        };
    }

    function memoize2(fn) {
        // Memoize, but ignore 'this'
        var cache = new Cache();

        return function () {
            var args = arguments;
            var self = this;
            var cargs = Array.prototype.slice.call(args);

            return cache.get(cargs, function () {
                return fn.apply(self, args);
            });
        };
    }

    return {
        fitRectangleScale: fitRectangleScale,
        fitOuterRectangleScale: fitOuterRectangleScale,
        fitRectangle: fitRectangle,
        fitOuterRectangle: fitOuterRectangle,
        roundRectangle: roundRectangle,
        extendObjectWithFields: extendObjectWithFields,
        extend: extend,
        clone: clone,
        setCursorImage: setCursorImage,
        memoize: memoize,
        memoize2: memoize2
    };
});
