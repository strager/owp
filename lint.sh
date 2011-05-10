#!/bin/bash

# TODO Make this not bash-specific
# (I'm not even sure if it is)

type -P jshint &> /dev/null || {
    echo 'Missing executable: jshint' >&2
    echo 'Please install node-jshint or a similar package to lint this project' >&2
    exit 1
}

jshint "$@" src/ test/ index.js test.js
