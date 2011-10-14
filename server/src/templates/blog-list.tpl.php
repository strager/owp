<?php foreach ($posts as $post): ?>
<article>
<h2><a href="<?php e($post['url']); ?>"><?php e($post['title']); ?></a></h2>
<?php echo $post['bodyHtml']; ?>
<p class="meta">Posted on <time pubdate datetime="<?php e(date('c', $post['date'])); ?>"><?php e(date('j F Y', $post['date'])); ?></time></p>
</article>
<?php endforeach; ?>
