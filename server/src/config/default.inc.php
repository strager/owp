<?php

$config->template_dir = realpath(APP_ROOT . '/templates');

$config->db_host = 'localhost';
$config->db_port = 3306;
$config->db_database = 'test';
$config->db_username = 'root';
$config->db_password = '';

$config->forum_table_prefix = 'forum_';

$config->owp_script_path = APP_ROOT . '/../../owp.js'; // KINDA BROKEN FIXME
$config->owp_maps_root = APP_ROOT . '/../..';
$config->owp_skin_root = APP_ROOT . '/../../skin';

$config->ga_account_id = null;

$config->twitter = 'owpgame';

