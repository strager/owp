<?php

require_once 'applicationfactory.php';
require_once 'bucket.inc.php';
date_default_timezone_set('Europe/Paris');

function create_container() {
    $factory = new ApplicationFactory();
    $container = new bucket_Container($factory);

    $factory->template_dir = realpath(APP_ROOT . '/templates');

    $factory->pdo_dsn = 'mysql:host=localhost;dbname=test';
    $factory->pdo_username = 'root';

    // TODO
    $factory->owp_script_path = '/owp.min.js';
    $factory->owp_maps_root = APP_ROOT . '/..';
    $factory->owp_skin_root = APP_ROOT . '/../skin';

    $factory->ga_account_id = null;

    $factory->twitter = 'owpgame';

    return $container;
}
