<?php

error_reporting(E_ALL | E_STRICT);

define('APP_ROOT', dirname(__FILE__) . '/src');
define('WEB_ROOT', dirname(__FILE__));

set_include_path(
    get_include_path()
    . PATH_SEPARATOR . APP_ROOT
    . PATH_SEPARATOR . APP_ROOT . '/vendor'
    . PATH_SEPARATOR . APP_ROOT . '/lib'
);

date_default_timezone_set('UTC');

require_once 'util.php';

require_once 'konstrukt/konstrukt.inc.php';
set_error_handler('k_exceptions_error_handler');
spl_autoload_register('k_autoload');

function create_container() {
    require_once 'bucket.inc.php';
    require_once APP_ROOT . '/config/global.inc.php';

    $config = new ApplicationFactory();
    $container = new bucket_Container($config);

    reconfigure($config);

    return $container;
}

$debug_log_path = null;
$debug_enabled = false;

k()
    // Use container for wiring of components
    ->setComponentCreator(new k_InjectorAdapter(create_container()))
    // Location of debug logging
    ->setLog($debug_log_path)
    // Enable/disable in-browser debugging
    ->setDebug($debug_enabled)
    // Dispatch request
    ->run('components_Root')
    ->out();
