define('ui/Control', [ 'util/util', 'ui/helpers', 'util/PubSub' ], function (util, uiHelpers, PubSub) {
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
            alignY: 0.5
        }, spec);

        util.extend(this, spec.vars);

        this.events = {
            click: new PubSub(),
            hoverIn: new PubSub(),
            hoverOut: new PubSub(),
            mouseDown: new PubSub(),
            mouseUp: new PubSub(),
            state: new PubSub()
        };

        this.currentState = 'default';

        var props = 'x,y,button,alignX,alignY'.split(',');

        if (spec.image) {
            var image = ui.assetManager.get(spec.image, 'image');
            uiHelpers.bindConstant(this, 'image', image);

            if (!spec.width && !spec.height) {
                spec.width = image.width * spec.scale;
                spec.height = image.height * spec.scale;
            } else if (!spec.width) {
                spec.width = spec.height / image.height * image.width;
            } else if (!spec.height) {
                spec.height = spec.width / image.width * image.height;
            }

            props.push('width');
            props.push('height');
        }

        if (typeof spec.text !== 'undefined') {
            uiHelpers.bindTemplate(this, 'text', spec.text, ui.vars);

            props.push('characterScale');
        }

        props.forEach(function (n) {
            uiHelpers.bindEasable(this, n, spec, n);
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

        updateState: function (state) {
            if (state !== this.currentState) {
                this.currentState = state;
                this.events.state.publish(state);
            }
        },

        bindMouse: function (mousePubSub) {
            var self = this;

            var wasDown = false;
            var wasInside = false;

            mousePubSub.subscribe(function (m) {
                var down = m.left || m.right;
                var inside = self.hitTest(m.x, m.y);

                if (down && inside && !wasDown) {
                    self.events.mouseDown.publish();
                }

                // TODO Other event types

                if (inside) {
                    if (down) {
                        self.updateState('down');
                    } else {
                        self.updateState('hover');
                    }
                } else {
                    self.updateState('default');
                }

                wasDown = down;
                wasInside = inside;
            });
        },

        bounds: function () {
            var w = this.width();
            var h = this.height();
            var cx = this.centerX();
            var cy = this.centerY();

            return [
                cx - w / 2,
                cy - h / 2,
                cx + w / 2,
                cy + h / 2
            ];
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
