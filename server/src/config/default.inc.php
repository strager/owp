<?php

$config->template_dir = realpath(APP_ROOT . '/templates');

$config->pdo_dsn = 'mysql:host=localhost;dbname=test';
$config->pdo_username = 'root';
$config->pdo_password = '';

$config->owp_script_path = APP_ROOT . '/../../owp.js'; // KINDA BROKEN FIXME
$config->owp_maps_root = APP_ROOT . '/../..';
$config->owp_skin_root = APP_ROOT . '/../../skin';

$config->ga_account_id = null;

$config->twitter = 'owpgame';

