#!/usr/bin/env bash

DIST=dist
SRC=src
LIBS=$SRC/lib
ENVIRONMENT="production"

if [ "$1" == "development" ]
then 
    ENVIRONMENT="development"
    DIST="dev"
fi

[ ! -d $SRC ] && { echo >&2 "Error: Source folder not found, run this script from the client folder root."; exit 1; }

type uglifyjs >/dev/null 2>&1 || { echo >&2 "Error: uglify-es is needed but it's not installed."; exit 1; }
type cleancss >/dev/null 2>&1 || { echo >&2 "Error: clean-css-cli is needed but it's not installed."; exit 1; }

echo "Starting a $ENVIRONMENT build..."

[ -d $DIST ] && rm -r $DIST
mkdir $DIST

# Process application code
cp $SRC/{app.js,app.css,index.html} $DIST/

STYLES=$DIST/app.css
SCRIPTS=$DIST/app.js
INDEX=$DIST/index.html

updateIndex () {
    cachebuster=$(sha256sum "$1" | cut -c 1-9)
    extension=$(echo "$1" | cut -f2 -d".")
    target=${1//.$extension/."$cachebuster".$extension}
    mv "$1" "$target"
    sed -i '' "s/$2/$(basename "$target")/g" $INDEX
}

# CSS
cleancss -o $STYLES $STYLES
updateIndex "$STYLES" "___appstylesfile___"

# JS
sed -i '' "s/___environment___/$ENVIRONMENT/g" $SCRIPTS
uglifyjs -o $SCRIPTS $SCRIPTS
updateIndex "$SCRIPTS" "___appscriptsfile___"

# Third-party libraries
VENDORS=$DIST/vendors.js
true > $VENDORS

normalise () {
    grep -v "^\s*//#" "$1" | tr '\n' "[:space:]"
}

while IFS= read -r -d '' lib; do
    # The qr-scanneer-worker file needs to be available on it's own
    if [[ $lib == */qr-scanner-worker.min.js ]]
    then
        normalise "$lib" > $DIST/qr-scanner-worker.min.js
    else
        normalise "$lib" >> $VENDORS
        echo "" >> $VENDORS
    fi
done< <(find $LIBS -type f -name '*.js' -print0)
updateIndex "$VENDORS" "___vendorsfile___"

echo "Done."
