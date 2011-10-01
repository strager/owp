#!/usr/bin/env php
<?php

error_reporting(E_ALL | E_STRICT);

require_once dirname(__FILE__) . '/../vendor/packo-sprite/SpritePacker.php';

function error($message) {
    fwrite(STDERR, 'ERROR: ');
    fwrite(STDERR, $message);
    fwrite(STDERR, "\n");
    exit(1);
}

// Try to keep this in sync with src/Skin.js
$skinFiles = array(
    'hitcircle',
    'approachcircle',
    'hitcircleoverlay',
    'cursor',
    'cursortrail',
    'hit0',
    'hit50',
    'hit100',
    'hit100k',
    'hit300k',
    'hit300',
    'sliderscorepoint',
    'sliderpoint30',
    'sliderpoint10',
    'reversearrow',
    'sliderb0',

    'ranking-a-small',
    'ranking-a',
    'ranking-b-small',
    'ranking-b',
    'ranking-c',
    'ranking-d-small',
    'ranking-d',
    'ranking-s-small',
    'ranking-s',
    'ranking-sh-small',
    'ranking-sh',
    'ranking-accuracy',
    'ranking-back',
    'ranking-c-small',
    'ranking-graph',
    'ranking-maxcombo',
    'ranking-panel',
    'ranking-perfect',
    'ranking-replay',
    'ranking-retry',
    'ranking-title',
    'ranking-x-small',
    'ranking-x',
    'ranking-xh-small',
    'ranking-xh',

    'default-0',
    'default-1',
    'default-2',
    'default-3',
    'default-4',
    'default-5',
    'default-6',
    'default-7',
    'default-8',
    'default-9',
    'default-comma',
    'default-dot',

    'score-0',
    'score-1',
    'score-2',
    'score-3',
    'score-4',
    'score-5',
    'score-6',
    'score-7',
    'score-8',
    'score-9',
    'score-comma',
    'score-dot',
    'score-percent',
    'score-x',

    'ready-to-play'
);

if (count($argv) < 2) {
    error('Not enough arguments.  Usage: ' . $argv[0] . ' skin_directory');
}

$skinDir = $argv[1];
if (!is_dir($skinDir)) error('Not a directory: ' . $skinDir);

$sheetDir = $skinDir;
if (!file_exists($sheetDir)) mkdir($sheetDir);
if (!is_dir($sheetDir)) error('Not a directory: ' . $sheetDir);

$skinputFiles = array();
foreach ($skinFiles as $skinFile) {
    $skinputFiles[] = $skinDir . '/' . $skinFile . '.png';
}

$spritePacker = new SpritePacker(1024, 1024, true);
$spritePacker->insertFiles($skinputFiles);

$definitions = $spritePacker->getSpriteSheetDefinitions();
$spritePacker->writeSpriteSheets($sheetDir);

$archive = array(
    'sheets' => $definitions
);

file_put_contents($skinDir . '/skin.owpa', json_encode($archive));
