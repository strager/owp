<?php

define('phorum_page', 'index');

$oldCwd = getcwd();
chdir(WEB_ROOT . '/forum/');
require_once './common.php';
require_once './include/format_functions.php';
require_once './include/api/modules.php';
chdir($oldCwd);

class phorum {
    private $rollBackStates = array();
    private $cwds = array();

    function url($path = null) {
        global $PHORUM;

        $base = $PHORUM['http_path'];

        if ($path === null) {
            return $base;
        } else {
            return $base . '/' . ltrim($path, '/');
        }
    }

    function getThreads($forumId, $bodies) {
        $this->start();

        $this->set('forum_id', (int) $forumId);

        $threads = phorum_db_get_thread_list(0, $bodies);

        $this->end();
        return $threads;
    }

    function getMessageUrl($thread) {
        if (func_num_args() === 2) {
            $forumId = func_get_arg(0);
            $messageId = func_get_arg(1);
        } else {
            $forumId = $thread['forum_id'];
            $messageId = $thread['message_id'];
        }

        return $this->url(sprintf('/read.php?%d,%d', $forumId, $messageId));
    }

    function formatMessage($message) {
        $this->start();

        list($formatted) = phorum_format_messages(array($message));

        $this->end();
        return $formatted;
    }

    private function set($key, $value) {
        global $PHORUM;

        $state = end($this->rollBackStates);
        if (!array_key_exists($key, $state)) {
            // Store old value so we can roll back later
            $state[$key] = $PHORUM[$key];
        }

        $PHORUM[$key] = $value;
    }

    private function start() {
        array_push($this->cwds, getcwd());
        chdir(WEB_ROOT . '/forum/');

        array_push($this->rollBackStates, array());
    }

    private function end() {
        global $PHORUM;

        $state = array_pop($this->rollBackStates);
        foreach ($state as $key => $value) {
            $PHORUM[$key] = $value;
        }

        $cwd = array_pop($this->cwds);
        chdir($cwd);
    }
}
