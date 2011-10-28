define('gfx/renderCanvasText', [ 'util/util' ], function (util) {
    function forceCss(element) {
        element.style.margin = '0';
        element.style.padding = '0';
        element.style.position = 'static';
        element.style.float = 'none';
        element.style.clear = 'none';
        element.style.width = 'auto';
        element.style.height = 'auto';
        element.style.visibility = 'visibile';
    }

    function renderCanvasText(text /* options... */) {
        var options = util.extend.apply(util, [ {
            width: null,
            textHeight: 16,
            lineHeight: 1.3,
            fontFace: 'sans-serif',
            align: 'left',
            color: 'black',
            scale: 1
        } ].concat(Array.prototype.slice.call(arguments, 1)));

        var width = options.width * options.scale;
        var textHeight = options.textHeight * options.scale;
        var lineHeight = options.lineHeight;
        var fontFace = options.fontFace;
        var align = options.align;
        var color = options.color;

        var lines = text.split('\n');

        // Measure using HTML
        var htmlContainer = document.createElement('div');
        forceCss(htmlContainer);
        htmlContainer.style.width = width > 0 ? (width + 'px') : 'auto';
        htmlContainer.style.fontFace = fontFace;
        htmlContainer.style.fontSize = textHeight + 'px';
        htmlContainer.style.lineHeight = lineHeight;
        htmlContainer.style.textAlign = align;
        htmlContainer.style.color = color; // Won't do anything, but why not?

        // Split the text into p elements and character spans, so we can
        // record their positions (especially for word wrapping).
        var spans = [ ];
        var paragraphs = lines.map(function (lineText) {
            // WARNING: Non-functional map

            var p = document.createElement('p');
            forceCss(p);
            p.margin = '0.25em 0';

            lineText.split('').forEach(function (character) {
                var span = document.createElement('span');
                forceCss(span);
                span.textContent = character;
                span.whiteSpace = 'pre';
                p.appendChild(span);

                spans.push(span);
            });

            htmlContainer.appendChild(p);
            return p;
        });

        // To get a width and height, the DOM element must be part of a
        // document.  Kinda lame, yeah...  Let's hope we don't inherit
        // !important styles!
        htmlContainer.style.visibility = 'hidden';
        htmlContainer.style.position = 'absolute';
        htmlContainer.style.left = '0';
        htmlContainer.style.top = '0';
        document.body.appendChild(htmlContainer);

        // Grab metrics
        var domWidth = htmlContainer.offsetWidth;
        var domHeight = htmlContainer.offsetHeight;

        // Build lines based on what is shown on screen
        var domText = lines.join('');
        var domLines = [ ];
        var domLineXs = [ ];
        var domLineYs = [ ];
        var i;
        for (i = 0; i < domText.length; ++i) {
            var character = domText.substr(i, 1);
            var x = spans[i].offsetLeft;
            var y = spans[i].offsetTop;

            if (i === 0) {
                domLines.push('');
                domLineXs.push(x);
                domLineYs.push(y);
            }

            if (domLineYs[domLineYs.length - 1] !== y) {
                // New line
                domLines.push(character);
                domLineXs.push(x);
                domLineYs.push(y);
            } else {
                // Old line
                domLines[domLines.length - 1] += character;
            }
        }

        document.body.removeChild(htmlContainer);

        var canvas = document.createElement('canvas');
        canvas.width = domWidth;
        canvas.height = domHeight;

        var context = canvas.getContext('2d');
        context.font = textHeight + 'pt ' + fontFace;
        context.textAlign = 'start';
        context.textBaseline = 'top';
        context.fillStyle = color;

        domLines.forEach(function (lineText, i) {
            var x = domLineXs[i];
            var y = domLineYs[i];
            context.fillText(lineText, x, y);
        });

        return canvas;
    }

    return renderCanvasText;
});
