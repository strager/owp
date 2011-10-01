define('ui/UI', [ 'ui/Control', 'util/PubSub' ], function (Control, PubSub) {
    function UI(assetManager) {
        this.assetManager = assetManager;

        this.controls = [ ];
        this.vars = { };
        this.events = { };

        this.mouse = new PubSub();
    }

    UI.prototype = {
        build: function (spec) {
            spec.forEach(function (controlSpec) {
                this.register(new Control(this, controlSpec));
            }, this);
        },

        register: function (control) {
            control.bindMouse(this.mouse);
            this.controls.push(control);
        }
    };

    return UI;
});
