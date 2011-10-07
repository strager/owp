<!DOCTYPE html>
<html>
<head>
    <title><?php e($title); ?></title>
<?php foreach ($styles as $style): ?>
    <link rel="stylesheet" href="<?php e($style); ?>" />
<?php endforeach; ?>
</head>
<body>

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
