<?php

require_once 'config.php';
require_once 'maps.php';

require 'header.php';

?>

<h1>owp</h1>
<p>Choose a map to play:</p>
<ul>
    <?php foreach ($maps as $id => $map) { ?>
    <li><a href="play.php?map=<?php echo htmlspecialchars(urlencode($id)); ?>"><?php echo htmlspecialchars($map['text']); ?></a></li>
    <?php } ?>
</ul>

<script src="<?php echo htmlspecialchars($owpScriptPath); ?>"></script>
<script>
// Try to preload to reduce map load time
game.loadSkin(<?php echo json_encode($skinsRoot); ?>);
</script>

<?php

require 'footer.php';
