<?php

function create_container() {
    require_once dirname(__FILE__) . '/vendor/bucket.inc.php';
    require_once dirname(__FILE__) . '/config/global.inc.php';

    $config = new ApplicationFactory();
    $container = new bucket_Container($config);

    reconfigure($config);

    return $container;
}

$OWP_CONTAINER = create_container();
