#!/usr/bin/env bash

SRC=src
LIBS=$SRC/lib
CHECKSUM="dependencies.hash"
true > $CHECKSUM

SOURCES=(
    "https://cdn.jsdelivr.net/npm"
    "https://unpkg.com"
)

[ ! -d $SRC ] && { echo "Error: Source folder not found, run this script from the client folder root."; exit 1; }

while IFS= read -r -d '' lib; do
    actual=$(sha256sum "$lib" | cut -f1 -d" ")
    for source in "${SOURCES[@]}"
    do
        hash=$(curl "$source""${lib//$LIBS/}"  --silent | sha256sum | cut -f1 -d" ")
        if [ "$actual" = "$hash" ]
        then
            echo "[OK] $lib compared to $source"
        else
            echo "[!] Signature doesn't match for $lib (based on $source)"
        fi
    done
    echo "$lib:$actual" >> $CHECKSUM
done< <(find $LIBS -type f -name '*.js' -print0)
