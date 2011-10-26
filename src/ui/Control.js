define('ui/Control', [ 'util/util', 'ui/helpers', 'util/PubSub' ], function (util, uiHelpers, PubSub) {
    var eventTypes = 'click,hoverIn,hoverOut,mouseDown,mouseUp'.split(',');

    // Values ordered by increasing priority
    var eventStatePriorities = {
        'init':      [ 'default' ],
        'click':     [ 'default', 'hover', 'click' ],
        'hoverIn':   [ 'default', 'hover' ],
        'hoverOut':  [ 'default' ],
        'mouseDown': [ 'default', 'hover', 'mouseDown' ],
        'mouseUp':   [ 'default', 'hover' ]
    };

    function getValue(spec, name, eventType) {
        var value /* = undefined */;
        var states = eventStatePriorities[eventType];
        states.forEach(function (state) {
            var v;
            if (state === 'default') {
                v = spec[name];
            } else if (spec[state]) {
                v = spec[state][name];
            }

            if (typeof v !== 'undefined') {
                value = v;
            }
        });

        return value;
    }

    function Control(ui, spec) {
        spec = util.extend({
            x: 0,
            y: 0,
            characterScale: 1,
            scale: 1,
            width: null,
            height: null,
            name: null,
            button: false,
            alignX: 0.5,
            alignY: 0.5,
            action: null,
            bounds: [ Infinity, Infinity, -Infinity, -Infinity ]
        }, spec);

        this.events = { };
        eventTypes.forEach(function (type) {
            this.events[type] = new PubSub();
        }, this);

        var stateValues = { };

        var props = 'x,y,button,alignX,alignY'.split(',');

        if (spec.image) {
            uiHelpers.bindValue(this, 'image', this.events, function (eventType) {
                var imageTemplate = getValue(spec, 'image', eventType);
                var imageName = uiHelpers.templateReplace(imageTemplate, ui.vars);
                return ui.skin.assetManager.get(imageName, 'image');
            });

            uiHelpers.bindEasable(this, 'width', this.events, function (eventType) {
                var image = this.image();

                var width = getValue(spec, 'width', eventType);
                if (!width) {
                    var height = getValue(spec, 'height', eventType);
                    if (!height) {
                        // Neither width nor height given; use image width
                        width = image.width;
                    } else {
                        // Given height but not width; calculate width given
                        // height and correct aspect ratio
                        width = height / image.height * image.width;
                    }
                }

                var scale = getValue(spec, 'scale', eventType);
                return width * scale;
            });

            uiHelpers.bindEasable(this, 'height', this.events, function (eventType) {
                var image = this.image();

                var height = getValue(spec, 'height', eventType);
                if (!height) {
                    var width = getValue(spec, 'width', eventType);
                    if (!width) {
                        // Neither width nor height given; use image height
                        height = image.height;
                    } else {
                        // Given width but not height; calculate height given
                        // width and correct aspect ratio
                        height = width / image.width * image.height;
                    }
                }

                var scale = getValue(spec, 'scale', eventType);
                return height * scale;
            });
        }

        if (typeof spec.text !== 'undefined') {
            uiHelpers.bindTemplate(this, 'text', spec.text, ui.vars);

            props.push('characterScale');
        }

        props.forEach(function (prop) {
            uiHelpers.bindEasable(this, prop, this.events, function (eventType) {
                return getValue(spec, prop, eventType);
            });
        }, this);

        uiHelpers.bindValue(this, 'bounds', this.events, function (eventType) {
            return getValue(spec, 'bounds', eventType);
        });

        var eventActions = uiHelpers.buildEventValues(eventStatePriorities, 'action', spec);
        Object.keys(eventActions).forEach(function (eventType) {
            var action = eventActions[eventType];

            if (action) {
                this.events[eventType].subscribe(function () {
                    var pubSub = ui.events[action];

                    if (pubSub) {
                        pubSub.publish();
                    }
                });
            }
        }, this);

        this.name = spec.name;

        this.isVisible = true;
    }

    function center(x, align, width) {
        return (x + width / 2) - width * align;
    }

    Control.prototype = {
        centerX: function () {
            return center(this.x(), this.alignX(), this.width());
        },

        centerY: function () {
            return center(this.y(), this.alignY(), this.height());
        },

        bindMouse: function (mousePubSub) {
            var self = this;

            var wasDown = false;
            var wasInside = false;

            var lastDownWasInside = false;

            mousePubSub.subscribe(function (m) {
                var down = m.left || m.right;
                var inside = self.hitTest(m.x, m.y);

                if (down && !wasDown) {
                    lastDownWasInside = inside;
                }

                if (down && inside && !wasDown) {
                    self.events.mouseDown.publish();
                }

                if (!down && inside && wasDown) {
                    self.events.mouseUp.publish();

                    if (lastDownWasInside) {
                        self.events.click.publish();
                    }
                }

                if (inside && !wasInside) {
                    self.events.hoverIn.publish();
                }

                if (!inside && wasInside) {
                    self.events.hoverOut.publish();
                }

                // TODO Other event types

                wasDown = down;
                wasInside = inside;
            });
        },

        hitTest: function (x, y) {
            var bounds = this.bounds();

            if (x < bounds[0] || y < bounds[1]) {
                return false;
            }

            if (x >= bounds[2] || y >= bounds[3]) {
                return false;
            }

            return true;
        }
    };

    return Control;
});
