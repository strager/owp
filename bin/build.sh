#!/bin/bash

DIR="$( cd "$( dirname "$0" )" && pwd )"
ROOT="$DIR/.."
OUT="$ROOT/owp.min.js"

(
    # Build main JS file
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
    # Minify with Google Closure Compiler
    type java > /dev/null 2>&1 \
        && java -jar "$DIR/google-closure-compiler-1180.jar" \
            --compilation_level SIMPLE_OPTIMIZATIONS \
        || (echo 'WARNING: Java not installed; skipping Google Closure Compiler minification' >&2; cat)
) | (
    # Minify with UglifyJS
    type uglifyjs > /dev/null 2>&1 \
        && uglifyjs \
        || (echo 'WARNING: UglifyJS not installed; skipping UglifyJS minification' >&2; cat)
) | (
    # Add license information
    # TODO Have licenses loaded properly using @preserve
    cat <<'EOF'
/*
es5-shim

-- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
-- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License (Narwhal Project)
-- dantman Daniel Friesen Copyright(C) 2010 XXX No License Specified
-- fschaefer Florian Schäfer Copyright (C) 2010 MIT License
-- Irakli Gozalishvili Copyright (C) 2010 MIT License
*//*
Q

Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
at http://www.opensource.org/licenses/mit-license.html
Forked at ref_send.js version: 2009-05-11

Copyright 2009-2011 Kris Kowal under the terms of the MIT
license found at http://github.com/kriskowal/q/raw/master/LICENSE
*//*
owp

owp copyright 2010-2011 strager
Just credit me and I'll be happy.  MIT or something.
*/
EOF
    cat
) > "$OUT"

echo "Build done; see $OUT"
