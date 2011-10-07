<?php

require_once 'applicationfactory.php';
require_once 'bucket.inc.php';
date_default_timezone_set('Europe/Paris');

function create_container() {
    $factory = new ApplicationFactory();
    $container = new bucket_Container($factory);

    $factory->template_dir = realpath(dirname(__FILE__) . '/../templates');

    $factory->pdo_dsn = 'mysql:host=localhost;dbname=test';
    $factory->pdo_username = 'root';

    $factory->owp_script_path = '/owp.min.js'; // TODO
    $factory->owp_skin_root = ''; // TODO
    $factory->owp_maps_root = '/assets';

    return $container;
}
