define('game/storyboardObject', [ 'util/util', 'util/ease', 'util/CueList' ], function (util, ease, CueList) {
    function BaseColor(color, time) {
        this.color = color.slice();
        this.time = time;
    }

    function Background(filename, time) {
        this.layer = 'Background'; // Like, obviously~
        this.filename = filename;
        this.time = time;
    }

    function Video(filename, time) {
        this.layer = 'Background';
        this.filename = filename;
        this.time = time;
    }

    function Sprite(spec) {
        spec = util.extend({
            layer: 'Foreground',
            filename: null,
            x: 320,
            y: 480,
            alignX: 0.5,
            alignY: 0.5,
            alpha: 1,
            scale: 1,
            rotation: 0,
            color: [ 255, 255, 255, 255 ]
        }, spec);

        util.extend(this, spec);

        if (!this.commands) {
            this.commands = new CueList();
        }
    }

    Sprite.prototype.addCommand = function (command) {
        this.commands.add(command, command.fromTime, command.toTime);
    };

    Sprite.prototype.getLifetime = function () {
        return this.commands.getTimeRange();
    };

    Sprite.prototype.getAtTime = function (time) {
        // TODO Some intelligent caching

        var sprite = new Sprite(this);

        // osu! has this logic where the first time a command of its type is
        // placed, that command "initializes" itself on the sprite at time
        // -Infinity.

        var initialized = [ ];
        this.commands.cueValues.forEach(function (command) {
            var Type = command.constructor;
            if (initialized.indexOf(Type) >= 0) {
                return;
            }

            command.initialize(sprite);
            initialized.push(Type);
        });

        var commands = this.commands.getAllInTimeRange(-Infinity, time);
        commands.forEach(function (command) {
            command.applyTo(sprite, time);
        });

        return sprite;
    };

    function AlphaCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    AlphaCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.alpha = ease.scale(this.fromValue, this.toValue, t);
    };

    AlphaCommand.prototype.initialize = function (sprite) {
        sprite.alpha = this.fromValue;
    };

    function RotateCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    RotateCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.rotation = ease.scale(this.fromValue, this.toValue, t);
    };

    RotateCommand.prototype.initialize = function (sprite) {
        sprite.rotation = this.fromValue;
    };

    function ScaleCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    ScaleCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.scale = ease.scale(this.fromValue, this.toValue, t);
    };

    ScaleCommand.prototype.initialize = function (sprite) {
        sprite.scale = this.fromValue;
    };

    function MoveCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    MoveCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.x = ease.scale(this.fromValue[0], this.toValue[0], t);
        sprite.y = ease.scale(this.fromValue[1], this.toValue[1], t);
    };

    MoveCommand.prototype.initialize = function (sprite) {
        sprite.x = this.fromValue[0];
        sprite.y = this.fromValue[1];
    };

    function MoveXCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    MoveXCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.x = ease.scale(this.fromValue, this.toValue, t);
    };

    MoveXCommand.prototype.initialize = function (sprite) {
        sprite.x = this.fromValue;
    };

    function MoveYCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    MoveYCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.y = ease.scale(this.fromValue, this.toValue, t);
    };

    MoveYCommand.prototype.initialize = function (sprite) {
        sprite.y = this.fromValue;
    };

    function ColorCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    ColorCommand.prototype.applyTo = function (sprite, time) {
        var t = this.easeFn(this.fromTime, this.toTime, time);
        sprite.color[0] = ease.scale(this.fromValue[0], this.toValue[0], t);
        sprite.color[1] = ease.scale(this.fromValue[1], this.toValue[1], t);
        sprite.color[2] = ease.scale(this.fromValue[2], this.toValue[2], t);
    };

    ColorCommand.prototype.initialize = function (sprite) {
        sprite.color[0] = this.fromValue[0];
        sprite.color[1] = this.fromValue[1];
        sprite.color[2] = this.fromValue[2];
    };

    return {
        BaseColor: BaseColor,
        Background: Background,
        Video: Video,
        Sprite: Sprite,

        AlphaCommand: AlphaCommand,
        ScaleCommand: ScaleCommand,
        RotateCommand: RotateCommand,
        MoveCommand: MoveCommand,
        MoveXCommand: MoveXCommand,
        MoveYCommand: MoveYCommand,
        ColorCommand: ColorCommand,

        easeFunctions: {
            // TODO Real easing functions
            '0': ease.lerp,
            '1': ease.sinOut,
            '2': ease.sinIn
        }
    };
});
