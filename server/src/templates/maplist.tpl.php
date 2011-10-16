<h1>owp maps</h1>
<p><a href="<?php e(url(array('game', 'upload'))); ?>">Upload custom map</a></p>

<p>Choose a map to play:</p>

<ul>
<?php foreach ($maps as $map) { ?>
    <li><a href="<?php e(url(array('game', 'play'), $map->urlParams())); ?>"><?php echo e($map->title()); ?></a></li>
<?php } ?>
</ul>
