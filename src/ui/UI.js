define('ui/UI', [ 'ui/Control', 'util/PubSub' ], function (Control, PubSub) {
    function UI() {
        this.controls = [ ];

        this.events = {
            mouse: new PubSub()
        };
    }

    UI.prototype.build = function (spec) {
        spec.forEach(function (controlSpec) {
            this.controls.push(new Control(this, controlSpec));
        }, this);
    };

    return UI;
});
