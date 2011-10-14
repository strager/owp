<!DOCTYPE html>
<html>
<head>

<title><?php e($title); ?></title>
<?php foreach ($styles as $style): ?>
<link rel="stylesheet" href="<?php e($style); ?>" />
<?php endforeach; ?>

<?php if ($ga): ?>
<script>
<?php echo $ga; ?>
</script>
<?php endif; ?>

<script>
OWP_CRASH_URL = <?php echo json_encode(url(array('crash-report'))); ?>;
</script>

</head>
<body>

<header>
<nav>
<ul>
<li><a href="<?php e(url(array('blog'))); ?>">Blog</a></li>
<li><a href="<?php e(url(array('game'))); ?>">Play owp</a></li>
<li><a href="<?php e(url(array('forum'))); ?>">Forums</a></li>
</ul>
</nav>
</header>

<?php echo $social; ?>

<?php echo $content; ?>

<?php foreach ($scripts as $script): ?>
<script src="<?php e($script); ?>"></script>
<?php endforeach; ?>
<?php foreach ($onload as $javascript): ?>
<script>
  <?php echo $javascript; ?>
</script>
<?php endforeach; ?>

</body>
</html>
