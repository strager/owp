<h1>owp maps</h1>
<p>Choose a map to play:</p>

<ul>
<?php foreach ($maps as $map) { ?>
    <li><a href="<?php echo e(url(array('game', 'play'), $map->urlParams())); ?>"><?php echo e($map->title()); ?></a></li>
<?php } ?>
</ul>
