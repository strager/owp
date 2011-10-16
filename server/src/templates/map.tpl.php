<p class="now-playing">Now playing:<br>
<span class="map"><?php e($map->title()); ?></a></p>

<?php if (!empty($relatedMaps)): ?>
<div class="related-maps">
Related maps:
<ul>
<?php foreach ($relatedMaps as $map): ?>
<li><span class="map"><a href="<?php e(url(array('game', 'play'), $map->urlParams())); ?>"><?php e($map->difficultyName()); ?></a></li>
<?php endforeach; ?>
</ul>
</div>
<?php endif; ?>

<?php echo $playfieldHtml; ?>
