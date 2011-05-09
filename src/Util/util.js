define('Util/util', [ ], function () {
    return {
        extendObjectWithFields: function (base, fields, extension) {
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
    };
});
