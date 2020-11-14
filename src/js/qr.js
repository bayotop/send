const QRCode = require("qrcode");
const QRScanner = require("qr-scanner").default;

import QrScannerWorkerPath from "../../node_modules/qr-scanner/qr-scanner-worker.min.js";
QRScanner.WORKER_PATH = `dist/${QrScannerWorkerPath}`;

export const scan = (video, callback) => {
    const scansPerSecond = 4;

    if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment"
            }
        }).then((stream) => {
            video.srcObject = stream;

            video.addEventListener("play", function() {
                QRScanner.createQrEngine(QRScanner.WORKER_PATH).then(engine => {
                    let count = 0;
                    (function _scanQR() {
                        QRScanner.scanImage(video, null, engine).then(url => {
                            callback(new URL(url));
                            destroy(video);
                        }).catch((error) => {
                            if (error == "No QR code found") {
                                count += 1;
                                if (count < scansPerSecond * 10) {
                                    setTimeout(_scanQR, 1000 / scansPerSecond);
                                }
                                else {
                                    destroy(video);
                                }
                            } else {
                                console.error(`Scan error: ${error}`);
                            }
                        });
                    })();
                });
            });
        });
    } else {
        console.warning("Webcam access is not supported in this environment.");
    }
};

export const generate = (data, callback) => {
    return QRCode.toCanvas(data, (error, canvas) => {
        if (error) {
            throw error;
        }
        callback(canvas);
    });
};

const destroy = (video) => {
    for (let track of video.srcObject.getTracks()) {
        track.stop();
    }

    video.remove();
};
