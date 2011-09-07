<?php

require_once 'config.php';
require_once 'maps.php';

require 'header.php';

?>

<body id="screen-map-select">

<h1>owp</h1>
<p class="follow"><a href="http://www.twitter.com/owpgame"><img src="http://twitter-badges.s3.amazonaws.com/t_logo-c.png" alt="Follow owp on Twitter"/></a></p>

<p>Choose a map to play:</p>
<ul>
    <?php foreach ($maps as $id => $map) { ?>
    <li><a href="play.php?map=<?php echo htmlspecialchars(urlencode($id)); ?>"><?php echo htmlspecialchars($map['text']); ?></a></li>
    <?php } ?>
</ul>

<script src="<?php echo htmlspecialchars($owpScriptPath); ?>"></script>
<script>
// Try to preload to reduce map load time
owp.game.loadSkin(<?php echo json_encode($skinsRoot); ?>);
</script>

</body>

<?php

require 'footer.php';
