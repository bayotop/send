Dependencies:

- `nacl-util.min.js` from [tweetnacl-util@0.15.1](https://www.npmjs.com/package/tweetnacl-util)
- `nacl.min.js` from [tweetnacl@1.0.3](https://www.npmjs.com/package/tweetnacl)
- `qr-scanner.umd.min.js` and `qr-scanner-worker.min.js` from [qr-scanner@1.2.0](https://www.npmjs.com/package/qr-scanner)
- `qrcode.min.js` from [qrcode@1.4.4](https://www.npmjs.com/package/qrcode)
- `uuidv4.min.js` from [uuid@8.3.2](https://www.npmjs.com/package/uuid)

To upgrade or add a new dependency:

1. Download the minified version from a trusted source and add it to [src/lib/](src/lib/).
2. Update and run [checksum.sh](scripts/checksum.sh).
3. Update and run [build.sh](scripts/build.sh) if the file needs special attention (by default it's copied into the `vendors.$cachebuster.js` bundle).
4. Update this README.

Development:

```bash
./scripts/build.sh development && python3 -m http.server -d dev 3000
```
