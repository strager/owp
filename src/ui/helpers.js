define('ui/helpers', [ ], function () {
    function bindTemplate(control, boundName, template) {
        control[boundName] = function () {
            return template.replace(/\$\{([a-zA-Z_]+)\}/g, function (_, name) {
                if (Object.prototype.hasOwnProperty.call(control, name)) {
                    return control[name];
                } else {
                    return _;
                }
            });
        };
    }

    function bindConstant(control, boundName, value) {
        control[boundName] = function () {
            return value;
        };
    }

    return {
        bindTemplate: bindTemplate,
        bindConstant: bindConstant
    };
});
