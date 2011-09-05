#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$DIR/.."
OUTPUT="$(mktemp -d)"

if [ "$#" -ne "1" ]; then
    echo "usage: $0 stage|demo|local" 2>&1
    exit 1
fi

case "$1" in
    demo)  HOST="train" ; AREA="~/owp/demo" ;;
    stage) HOST="train" ; AREA="~/owp/staging" ;;
    local) HOST=""      ; AREA="$ROOT/demo" ;;
    *) echo "ERROR: unknown area: $1" 2>&1 ; exit 2 ;;
esac

"$DIR/build.sh" "$OUTPUT/owp.js" || exit

cp "$ROOT/server/"*.php "$OUTPUT/" || exit
cp "$ROOT/server/"*.css "$OUTPUT/" || exit
rm "$OUTPUT/config.php" "$OUTPUT/config.example.php" || exit
ln -s "map-select.php" "$OUTPUT/index.php" || exit

if [ "$HOST" == "" ]; then
    mkdir -p "$AREA" || exit
    rsync -rlt -v "$OUTPUT/" "$AREA" || exit
else
    ssh "$HOST" mkdir -p "$AREA" || exit
    rsync -rlt -zv "$OUTPUT/" "$HOST:$AREA" || exit
fi
