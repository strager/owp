define('gfx/canvasShaders', [ ], function () {
    return {
        applyShaderToImage: function (shader, shaderData, image) {
            var newCanvas = document.createElement('canvas');
            newCanvas.width = image.width;
            newCanvas.height = image.height;

            var newContext = newCanvas.getContext('2d');

            newContext.globalCompositeOperation = 'copy';
            newContext.drawImage(image, 0, 0);

            var imageData = newContext.getImageData(0, 0, newCanvas.width, newCanvas.height);

            shader(imageData, shaderData);

            newContext.putImageData(imageData, 0, 0);

            return newCanvas;
        },

        multiplyByColor: function (imageData, color) {
            var i;

            for (i = 0; i < imageData.width * imageData.height; ++i) {
                imageData.data[i * 4 + 0] *= color[0] / 256;
                imageData.data[i * 4 + 1] *= color[1] / 256;
                imageData.data[i * 4 + 2] *= color[2] / 256;
            }
        }
    };
});
