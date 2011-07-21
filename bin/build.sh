#!/bin/bash

DIR="$( cd "$( dirname "$0" )" && pwd )"
ROOT="$DIR/.."
OUT="$ROOT/owp.min.js"

(
    # TODO Optimize NAMES
    NAMES='Math, Function, Array, String, Date, window'

    echo ';// I am awesome'
    echo "(function ($NAMES, undefined) {"
    cat "$ROOT/vendor/es5-shim.js"
    cat "$ROOT/vendor/q/q.js"
    echo
    echo ';window.onload = function () { var derequire_module__q = Q;'
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
