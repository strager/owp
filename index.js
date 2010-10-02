(function () {
    var $ = require('vendor/jquery').$;

    var audio = new window.Audio('assets/map.mp3');

    function debug(message) {
        console.log(message);
    }

    $(function () {
        $(audio).bind('timeupdate', function (e) {
            debug(this.currentTime);
        });

        audio.play();
    });
}());
