define('ui/helpers', [ 'util/ease', 'util/util' ], function (ease, util) {
    function templateReplace(template, vars) {
        return template.replace(/\$\{([^}]+)\}/g, function (_, name) {
            if (Object.prototype.hasOwnProperty.call(vars, name)) {
                return vars[name];
            } else {
                return _;
            }
        });
    }

    function bindTemplate(control, boundName, template, vars) {
        control[boundName] = function () {
            return templateReplace(template, vars);
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

        var eventValues = { 'default': sourceValues[property] };

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

    function bindValue(control, boundName, events, valueCallback) {
        var valueLoaded = false;
        var value;

        function currentValue() {
            if (!valueLoaded) {
                value = valueCallback.call(control, 'init');
                valueLoaded = true;
            }

            return value;
        }

        control[boundName] = currentValue;

        Object.keys(events).forEach(function (eventType) {
            events[eventType].subscribe(function () {
                value = valueCallback.call(control, eventType);
            });
        });
    }

    function bindEasable(control, boundName, events, valueCallback) {
        var valueLoaded = false;
        var fromValue, toValue;

        var startDate = Date.now();

        // TODO Overridable
        var easeDuration = 300;
        var easeFn = ease.smoothstep;

        function currentValue() {
            if (!valueLoaded) {
                fromValue = valueCallback.call(control, 'init');
                toValue = fromValue;
                valueLoaded = true;
                return fromValue;
            }

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
                toValue = valueCallback.call(control, eventType);
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
        templateReplace: templateReplace,
        bindTemplate: bindTemplate,
        buildEventValues: buildEventValues,
        bindValue: bindValue,
        bindEasable: bindEasable,
        bindConstant: bindConstant
    };
});
