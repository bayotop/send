#!/bin/bash

DIST=dist
SRC=src
ENVIRONMENT="production"

if [ "$1" == "development" ]
then 
    ENVIRONMENT="development"
fi

[ ! -d $SRC ] && { echo "Error: Source folder not found, run this script from the client folder root."; exit 1; }

type uglifyjs >/dev/null 2>&1 || { echo >&2 "Error: uglify-es is needed but it's not installed."; exit 1; }
type cleancss >/dev/null 2>&1 || { echo >&2 "Error: clean-css-cli is needed but it's not installed."; exit 1; }

echo "Starting a $ENVIRONMENT build..."

[ -d $DIST ] && rm -r $DIST
mkdir $DIST

# Process third-party libraries
CHECKSUM=dependencies.hash
VENDORS=$DIST/vendors.js
> $CHECKSUM
> $VENDORS

for file in $SRC/lib/*
do
    hash=$(sha256sum $file | cut -f1 -d" ")
    echo "$file:$hash" >> $CHECKSUM

    # The qr-scanneer-worker file needs to be available on it's own
    if [[ $file == */qr-scanner-worker*.min.js ]]
    then
        grep -v "^\s*//#" $file | tr '\n' [:space:] > $DIST/qr-scanner-worker.min.js
    else
        grep -v "^\s*//#" $file | tr '\n' [:space:] >> $VENDORS
        echo "" >> $VENDORS
    fi
done

cachebuster=$(sha256sum $VENDORS | cut -c 1-9)
mv $VENDORS $DIST/vendors.$cachebuster.js

# Process application code
cp $SRC/{app.js,app.css,index.html} $DIST/

STYLES=$DIST/app.css
SCRIPTS=$DIST/app.js
INDEX=$DIST/index.html

# Set vendors file in index.html
sed -i '' "s/{{vendorsfile}}/vendors.$cachebuster.js/" $INDEX

# Process CSS styles file
cleancss -o $STYLES $STYLES
cachebuster=$(sha256sum $STYLES | cut -c 1-9)
mv $STYLES $DIST/app.$cachebuster.css
sed -i '' "s/{{appstylesfile}}/app.$cachebuster.css/" $INDEX

# Process application JS file
sed -i '' "s?{{environment}}?$ENVIRONMENT?" $SCRIPTS
uglifyjs -o $SCRIPTS $SCRIPTS
cachebuster=$(sha256sum $SCRIPTS | cut -c 1-9)
mv $SCRIPTS $DIST/app.$cachebuster.js
sed -i '' "s/{{appscriptsfile}}/app.$cachebuster.js/" $INDEX

echo "Done."
