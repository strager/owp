define('ui/UI', [ 'ui/Control', 'util/PubSub' ], function (Control, PubSub) {
    function UI(assetManager) {
        this.assetManager = assetManager;

        this.controls = [ ];
        this.vars = { };

        this.events = {
            mouse: new PubSub()
        };
    }

    UI.prototype = {
        build: function (spec) {
            spec.forEach(function (controlSpec) {
                this.register(new Control(this, controlSpec));
            }, this);
        },

        register: function (control) {
            if (control.name) {
                if (this.controls[control.name]) {
                    throw new Error('Invalid or duplicate control name: ' + control.name);
                }

                this.controls[control.name] = control;
            }

            control.bindMouse(this.events.mouse);
            this.controls.push(control);
        }
    };

    return UI;
});
