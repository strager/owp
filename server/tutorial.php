<?php

require_once 'config.php';

require 'header.php';

?>

<body id="screen-tutorial">

<h2>Tutorial</h2>
<p>Watch the awesome tutorial to learn how to play!</p>
<p>Click to continue to the next screen.</p>
<p>Track is <a href="https://8bc.org/music/UncleBibby/Jeez+Louise+Lou+Ease+Le+Ooz+%28Nanoloop+on+iPod+Touch%29/">Jeez Louise Lou Ease Le Ooz by Peter Locke</a>, released under CC BY-NC-SA.</p>

<div id="playfield">
    <script type="text/javascript">document.write('<p>Loading...</p>');</script>
    <noscript>
        <p><strong style="color: red;">Error</strong>: JavaScript must be enabled to play.</p>
    </noscript>
</div>

<script src="<?php echo htmlspecialchars($owpScriptPath); ?>"></script>
<script>
game.loadSkin(<?php echo json_encode($skinsRoot); ?>);
game.tutorial(<?php echo json_encode($mapsRoot . '/tutorial'); ?>, "Jeez Louise Lou Ease Le Ooz.mp3");
</script>

</body>

<?php

require 'footer.php';

