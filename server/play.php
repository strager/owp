<?php

require_once 'config.php';
require_once 'maps.php';

if (!isset($_GET['map']) || !isset($maps[$_GET['map']])) {
    header('Location: map-select.php');
    die();
}

$map = $maps[$_GET['map']];

require 'header.php';

?>

<h1>owp</h1>
<p><?php echo htmlspecialchars($map['text']); ?></p>

<div id="playfield">
    <script type="text/javascript">document.write('<p>Loading...</p>');</script>
    <noscript>
        <p><strong style="color: red;">Error</strong>: JavaScript must be enabled to play.</p>
    </noscript>
</div>

<script src="<?php echo htmlspecialchars($owpScriptPath); ?>"></script>
<script>
game.loadSkin(<?php echo json_encode($skinsRoot); ?>);
game.startMap(<?php echo json_encode($mapsRoot . '/' . $map['root']); ?>, <?php echo json_encode($map['name']); ?>);
</script>

<?php

require 'footer.php';
