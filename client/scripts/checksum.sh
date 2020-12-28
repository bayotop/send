SRC=src
CHECKSUM=dependencies.hash
> $CHECKSUM

SOURCES=(
    "https://cdn.jsdelivr.net/npm/"
    "https://unpkg.com/"
)

LIBS=(
    "tweetnacl@1.0.3/nacl.min.js"
    "tweetnacl-util@0.15.1/nacl-util.min.js"
    "qr-scanner@1.2.0/qr-scanner-worker.min.js"
    "qr-scanner@1.2.0/qr-scanner.umd.min.js"
    "qrcode@1.4.4/build/qrcode.min.js"
    "uuid@8.3.2/dist/umd/uuidv4.min.js"
)

[ ! -d $SRC ] && { echo "Error: Source folder not found, run this script from the client folder root."; exit 1; }

for lib in "${LIBS[@]}"
do
    actual=$(sha256sum $SRC/lib/$(echo $lib | rev | cut -f1 -d"/" | rev) | cut -f1 -d" ")
    for source in "${SOURCES[@]}"
    do
        hash=$(curl $source$lib --silent | sha256sum | cut -f1 -d" ")
        if [ "$actual" = "$hash" ]
        then
            echo "[OK] $lib compared to $source"
        else
            echo "[!] Signature doesn't match for $lib (based on $source)"
        fi
    done
    echo "$lib:$actual" >> $CHECKSUM
done