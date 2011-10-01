define('ui/helpers', [ 'util/ease', 'util/util' ], function (ease, util) {
    function bindTemplate(control, boundName, template, vars) {
        control[boundName] = function () {
            return template.replace(/\$\{([^}]+)\}/g, function (_, name) {
                if (Object.prototype.hasOwnProperty.call(vars, name)) {
                    return vars[name];
                } else {
                    return _;
                }
            });
        };
    }

    function buildEventValues(eventStatePriorities, property, sourceValues) {
        // Converts
        //
        // esp   = { hoverIn: [ default, hover ], hoverOut: [ default ] }
        // props = x
        // vals  = { x: 42, hover: { x: 100 } }
        //
        // into
        //
        // { hoverIn: 100, hoverOut: 42, default: 42 }

        var eventValues = { default: sourceValues[property] };

        Object.keys(eventStatePriorities).forEach(function (eventType) {
            var value /* = undefined */;
            var states = eventStatePriorities[eventType];
            states.forEach(function (state) {
                var v;
                if (state === 'default') {
                    v = sourceValues[property];
                } else if (sourceValues[state]) {
                    v = sourceValues[state][property];
                }

                if (typeof v !== 'undefined') {
                    value = v;
                }
            });

            if (typeof value === 'undefined') {
                throw new Error('Bad property: ' + property);
            }

            eventValues[eventType] = value;
        });

        return eventValues;
    }

    function bindEasable(control, boundName, valueTable, events) {
        var fromValue = valueTable.default;
        var toValue = valueTable.default;

        var startDate = Date.now();

        // TODO Overridable
        var easeDuration = 300;
        var easeFn = ease.smoothstep;

        function currentValue() {
            if (easeDuration <= 0) {
                return toValue;
            }

            var t = easeFn(0, easeDuration, Date.now() - startDate);
            return ease.scale(fromValue, toValue, t);
        }

        control[boundName] = currentValue;

        Object.keys(events).forEach(function (eventType) {
            events[eventType].subscribe(function () {
                fromValue = currentValue();
                toValue = valueTable[eventType];
                startDate = Date.now();
            });
        });
    }

    function bindConstant(control, boundName, value) {
        control[boundName] = function () {
            return value;
        };
    }

    return {
        bindTemplate: bindTemplate,
        buildEventValues: buildEventValues,
        bindEasable: bindEasable,
        bindConstant: bindConstant
    };
});
