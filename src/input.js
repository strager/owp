define('input', [ 'util/PubSub' ], function (PubSub) {
    var mouse = new PubSub();

    var isLeftDown = false;
    var isRightDown = false;
    var mouseX, mouseY;

    function mouseStateChanged() {
        mouse.publishSync({
            x: mouseX,
            y: mouseY,
            left: isLeftDown,
            right: isRightDown
        });
    }

    function addRenderer(renderer) {
        var playArea = renderer.element;

        function button(event, callbacks) {
            var button;

            // Taken from jQuery
            if (!event.which && typeof event.button !== undefined) {
                button = event.button & 1 ? 1 : (event.button & 2 ? 3 : (event.button & 4 ? 2 : 0));
            } else {
                button = event.which;
            }

            var names = [ void 0, 'left', 'middle', 'right' ];
            var name = names[button];

            if (name && callbacks[name]) {
                callbacks[name]();
            }
        }

        function setMouseCoordinates(e, el) {
            var x = e.pageX - el.offsetLeft;
            var y = e.pageY - el.offsetTop;

            var pos = renderer.mouseToGame(x, y);
            mouseX = pos.x;
            mouseY = pos.y;
        }

        playArea.addEventListener('mousedown', function (e) {
            setMouseCoordinates(e, this);

            button(e, {
                left: function () {
                    isLeftDown = true;
                },
                right: function () {
                    isRightDown = true;
                }
            });

            mouseStateChanged();
            e.preventDefault();
        }, false);

        playArea.addEventListener('mouseup', function (e) {
            setMouseCoordinates(e, this);

            button(e, {
                left: function () {
                    isLeftDown = false;
                },
                right: function () {
                    isRightDown = false;
                }
            });

            mouseStateChanged();
            e.preventDefault();
        }, false);

        playArea.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false);

        playArea.addEventListener('mousemove', function (e) {
            setMouseCoordinates(e, this);
            mouseStateChanged();
        }, false);
    }

    function charToKey(c) {
        return c.charCodeAt(0);
    }

    var leftKeys  = 'ZAQCDEBGTMJU02468'.split('').map(charToKey);
    var rightKeys = 'XSWVFRNHY,ki13579'.split('').map(charToKey);

    function keyType(e) {
        if (e.repeat || e.metaKey || e.altKey || e.ctrlKey) {
            return 'none';
        }

        if (leftKeys.indexOf(e.which) >= 0) {
            return 'left';
        } else if (rightKeys.indexOf(e.which) >= 0) {
            return 'right';
        }

        return 'none';
    }

    window.document.addEventListener('keydown', function (e) {
        switch (keyType(e)) {
        case 'left':
            isLeftDown = true;
            e.preventDefault();
            mouseStateChanged();
            break;
        case 'right':
            isRightDown = true;
            e.preventDefault();
            mouseStateChanged();
            break;
        case 'none':
        default:
            // Ignore
            break;
        }
    }, false);

    window.document.addEventListener('keyup', function (e) {
        switch (keyType(e)) {
        case 'left':
            isLeftDown = false;
            e.preventDefault();
            mouseStateChanged();
            break;
        case 'right':
            isRightDown = false;
            e.preventDefault();
            mouseStateChanged();
            break;
        case 'none':
        default:
            // Ignore
            break;
        }
    }, false);

    return {
        mouse: mouse,
        addRenderer: addRenderer
    };
});
