<?php

if (!defined('PHORUM')) return;

require_once dirname(__FILE__) . '/../../../src/config/global.inc.php';

$config = (object) array();
reconfigure($config);

$PHORUM['DBCONFIG'] = array(
    'type'          => 'mysql',
    'name'          => $config->db_database,
    'server'        => $config->db_host,
    'user'          => $config->db_username,
    'password'      => $config->db_password,
    'table_prefix'  => $config->forum_table_prefix,
    'port'          => $config->db_port,
    'socket'        => NULL,

    //'down_page'     => 'http://www.example.com/phorum/down.html',
    //'upgrade_page'  => 'http://www.example.com/phorum/upgrade.html',

    'mysql_use_ft'  =>  '1', // fulltext
    'empty_search_table' => '0',

    'charset' => 'utf8',
    'mysql_php_extension' =>  NULL,
    'slaves' => array(),
);
