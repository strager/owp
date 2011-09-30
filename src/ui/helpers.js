define('ui/helpers', [ 'util/ease' ], function (ease) {
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

    function bindEasable(control, boundName, spec, name) {
        var fromValue = spec[name];
        var toValue = spec[name];

        var startDate = Date.now();

        var easeDuration = 0;
        var easeFn = ease.smoothstep;

        if (spec.ease && spec.ease[name]) {
            easeDuration = spec.ease[name][1];
            easeFn = ease[spec.ease[name][0]] || ease.smoothstep;
        }

        function currentValue() {
            var t = easeFn(0, easeDuration, Date.now() - startDate);
            return ease.scale(fromValue, toValue, t);
        }

        control[boundName] = currentValue;

        control.events.state.subscribe(function (state) {
            fromValue = currentValue();

            if (spec[state] && typeof spec[state][name] !== 'undefined') {
                toValue = spec[state][name];
            } else {
                toValue = spec[name];
            }

            startDate = Date.now();
        });
    }

    function bindConstant(control, boundName, value) {
        control[boundName] = function () {
            return value;
        };
    }

    return {
        bindTemplate: bindTemplate,
        bindEasable: bindEasable,
        bindConstant: bindConstant
    };
});
