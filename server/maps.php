<?php

require_once 'config.php';

function getMaps($root) {
    $maps = array();

    $dirs = scandir($root);
    foreach ($dirs as $dir) {
        $mapDir = $root . '/' . $dir;
        if (!is_numeric($dir) || !is_dir($mapDir)) {
            continue;
        }

        $files = scandir($mapDir);

        foreach($files as $file) {
            $matches = null;
            if (!preg_match('/^((.*) \((.*)\) \\[(.*)\\])\.osu$/', $file, $matches)) {
                continue;
            }

            $maps[$dir . '.' . $matches[4]] = array(
                'text' => $matches[2] . ' [' . $matches[4] . ']',
                'name' => $matches[1],
                'root' => $dir
            );
        }
    }

    return $maps;
}

$maps = getMaps('.');
