<?php

error_reporting(E_ALL | E_STRICT);

define('APP_ROOT', dirname(dirname(__FILE__)));
define('WEB_ROOT', dirname(dirname(__FILE__)) . '/..');

set_include_path(
    get_include_path()
    . PATH_SEPARATOR . APP_ROOT
    . PATH_SEPARATOR . APP_ROOT . '/vendor'
    . PATH_SEPARATOR . APP_ROOT . '/lib'
);

require_once 'util.php';

require_once 'konstrukt/konstrukt.inc.php';
set_error_handler('k_exceptions_error_handler');
spl_autoload_register('k_autoload');

require_once 'bucket.inc.php';
date_default_timezone_set('UTC');

function create_container() {
    $config = new ApplicationFactory();
    $container = new bucket_Container($config);

    reconfigure($config);

    return $container;
}

$debug_log_path = null;
$debug_enabled = false;

function reconfigure($config) {
    require_once dirname(__FILE__) . '/default.inc.php';

    if (is_file(dirname(__FILE__) . '/local.inc.php')) {
        require dirname(__FILE__) . '/local.inc.php';
    }
}
