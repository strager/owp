define('ui/Control', [ 'util/util', 'ui/helpers', 'util/PubSub' ], function (util, uiHelpers, PubSub) {
    function Control(ui, spec) {
        spec = util.extend({
            text: '',
            image: '',
            x: 0,
            y: 0,
            scale: 1,
            width: null,
            height: null,
            name: null,
            button: false,
            align: [ 0.5, 0.5 ]
        }, spec);

        util.extend(this, spec.vars);

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
        }

        uiHelpers.bindTemplate(this, 'text', spec.text);
        
        'x,y,width,height,button,align'.split(',').forEach(function (n) {
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

    function center(x, align, width) {
        return (x + width / 2) - width * align;
    }

    Control.prototype = {
        centerX: function () {
            return center(this.x(), this.align()[0], this.width());
        },

        centerY: function () {
            return center(this.y(), this.align()[1], this.height());
        }
    };

    return Control;
});
