define('game/storyboardObject', [ 'util/util', 'util/ease', 'util/CueList' ], function (util, ease, CueList) {
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

        var commands = this.commands.getAllInTimeRange(-Infinity, time);
        return commands.reduce(function (acc, command) {
            return command.applyTo(acc, time);
        }, this);
    };

    function AlphaCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    AlphaCommand.prototype.applyTo = function (sprite, time) {
        var nsprite = new Sprite(sprite);

        var t = this.easeFn(this.fromTime, this.toTime, time);
        nsprite.alpha = ease.scale(this.fromValue, this.toValue, t);

        return nsprite;
    };

    function ScaleCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    ScaleCommand.prototype.applyTo = function (sprite, time) {
        var nsprite = new Sprite(sprite);

        var t = this.easeFn(this.fromTime, this.toTime, time);
        nsprite.scale = ease.scale(this.fromValue, this.toValue, t);

        return nsprite;
    };

    function MoveCommand(easeFn, fromTime, toTime, fromValue, toValue) {
        this.easeFn = easeFn;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.fromValue = fromValue;
        this.toValue = toValue;
    }

    MoveCommand.prototype.applyTo = function (sprite, time) {
        var nsprite = new Sprite(sprite);

        var t = this.easeFn(this.fromTime, this.toTime, time);
        nsprite.x = ease.scale(this.fromValue[0], this.toValue[0], t);
        nsprite.y = ease.scale(this.fromValue[1], this.toValue[1], t);

        return nsprite;
    };

    return {
        Background: Background,
        Video: Video,
        Sprite: Sprite,

        AlphaCommand: AlphaCommand,
        ScaleCommand: ScaleCommand,
        MoveCommand: MoveCommand,

        easeFunctions: {
            // TODO Real easing functions
            '0': ease.lerp,
            '1': ease.lerp,
            '2': ease.lerp
        }
    };
});
