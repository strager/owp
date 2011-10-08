#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 destination < source-files" 2>&1
    exit 1
fi

destination="$1"

while read line; do
    dir="$(dirname "$line")"
    mkdir -p "$destination/$dir" || exit
    cp -ar "$line" "$destination/$dir" || exit
done
