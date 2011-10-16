<?php

function normalizePath($path, $ps = DIRECTORY_SEPARATOR) {
    $back = 0;
    $stack = array();

    foreach (explode($ps, $path) as $index => $part) {
        switch ($part) {
        case '':
            if ($index === 0) {
                // Initial /
                array_push($stack, '');
            } else {
                // Double / or trailing /; ignore
            }
            break;

        case '.':
            // Ignore
            break;

        case '..':
            if (empty($stack)) {
                ++$back;
            } else {
                array_pop($stack);
            }
            break;

        default:
            array_push($stack, $part);
            break;
        }
    }

    return str_pad('', $back * 3, '..' . $ps) . implode($ps, $stack);
}

// Based upon http://us2.php.net/manual/en/function.realpath.php#105876
// Public domain
function relativePath($from, $to, $ps = DIRECTORY_SEPARATOR) {
    $from = normalizePath($from, $ps);
    $to = normalizePath($to, $ps);
    $arFrom = explode($ps, rtrim($from, $ps));
    $arTo = explode($ps, rtrim($to, $ps));

    while (count($arFrom) && count($arTo) && ($arFrom[0] == $arTo[0])) {
        array_shift($arFrom);
        array_shift($arTo);
    }

    return str_pad('', count($arFrom) * 3, '..' . $ps) . implode($ps, $arTo);
}
