#!/bin/bash

DIR="$( cd "$( dirname "$0" )" && pwd )"
ROOT="$DIR/.."
OUT="$ROOT/owp.min.js"

(
    NAMES='document, window, Array, Object'

    echo ';// I am awesome'
    echo "(function ($NAMES, undefined) {"
    cat "$ROOT/vendor/es5-shim.js"
    cat "$ROOT/vendor/q/q.js"
    echo
    echo ';window.onload = function () {';
    echo 'var derequire_module__q = Q;'
    echo 'var DEBUG = false;'
    node "$DIR/derequire.js" "$ROOT/index.js" "$ROOT/src/"
    echo
    echo '};'
    echo "}($NAMES));"
) | (
    # TODO Detect UglifyJS and Java and don't run them if they don't exist
    java -jar "$DIR/google-closure-compiler-1180.jar" \
        --compilation_level SIMPLE_OPTIMIZATIONS | \
    uglifyjs
) > "$OUT"

echo "Build done; see $OUT"
