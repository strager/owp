<ul>
<?php foreach ($maps as $map) { ?>
    <li><a href="<?php echo e(url(array('game', 'play'), $map->urlParams())); ?>"><?php echo e($map->name()); ?></a></li>
<?php } ?>
</ul>
