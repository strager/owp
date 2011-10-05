#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

$DIR/vendor/mpm/migrate.php "$@"
