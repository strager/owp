define('ui/Control', [ 'util/util', 'ui/helpers', 'util/PubSub' ], function (util, uiHelpers, PubSub) {
    function Control(ui, spec) {
        spec = util.extend({
            text: '',
            image: '',
            x: 0,
            y: 0,
            width: null,
            height: null,
            scale: 1,
            name: null,
            button: false,
            align: [ 0.5, 0.5 ]
        }, spec);

        util.extend(this, spec.vars);

        uiHelpers.bindTemplate(this, 'text', spec.text);
        
        'image,x,y,width,height,scale,button,align'.split(',').forEach(function (n) {
            uiHelpers.bindConstant(this, n, spec[n]);
        }, this);

        this.name = spec.name;

        if (this.button) {
            this.events = {
                click: new PubSub(),
                hoverIn: new PubSub(),
                hoverOut: new PubSub(),
                mouseDown: new PubSub(),
                mouseUp: new PubSub()
            };

            // TODO Bind mouse in UI
        }

        this.isVisible = true;
    }

    return Control;
});
