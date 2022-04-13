// Environment specific variables are replaced in ~/scripts/build.sh
const ENVIRONMENT = "___environment___";

const nacl = window.nacl || {};
const QrScanner = window.QrScanner || {};

var settings = null;

const websocketHost = (ENVIRONMENT === "development") ? "ws://localhost:3001" : "wss://ws.bayo.io";

const wssend = (message, settings, callback) => {
    const socket = new WebSocket(`${websocketHost}/send/${settings.uuid}`);
    socket.onopen = () => {
        const encrypted = nacl.util.encodeBase64(
            nacl.secretbox(nacl.util.decodeUTF8(message), settings.nonce, settings.key)
        );

        socket.send(encrypted);
        callback();
    };
};

const wslisten = (settings, callback) => {
    const socket = new WebSocket(`${websocketHost}/listen/${settings.uuid}`);
    socket.onmessage = (event) => {
        callback(
            nacl.util.encodeUTF8(
                nacl.secretbox.open(nacl.util.decodeBase64(event.data), settings.nonce, settings.key))
        );
    };
};

const qrscan = (video, callback) => {
    const scansPerSecond = 4;

    if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment"
            }
        }).then((stream) => {
            video.srcObject = stream;

            video.addEventListener("play", function() {
                let count = 0;
                (function _scanQR() {
                    QrScanner.scanImage(video, {returnDetailedScanResult: true}).then(qr => {
                        callback(new URL(qr.data));
                        destroy(video);
                    }).catch((error) => {
                        if (/No QR code found/.test(error)) {
                            count += 1;
                            if (count < scansPerSecond * 10) {
                                setTimeout(_scanQR, 1000 / scansPerSecond);
                            }
                            else {
                                destroy(video);
                            }
                        } else {
                            console.error(error);
                        }
                    });
                })();
            });
        });
    } else {
        console.warning("Webcam access is not supported in this environment.");
    }
};

const qrgenerate = (data, callback) => {
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

const send = (message) => {
    const _redirect = () => {
        window.settings = settings = {};
        location.href="/";
    };

    if (settings) {
        wssend(message, settings, _redirect);
    } else {
        rewriteDOM("action-scan");
        qrscan(document.querySelector("video"), (url) => {
            wssend(message, getSettingsFromUrl(url), _redirect);
        });
    }
};

const listen = (settings) => {
    wslisten(settings, (data) => {
        document.getElementById("result").textContent = data;
        rewriteDOM("action-received");
    });
};

const rewriteDOM = (identifier) => {
    document.querySelector("div[id^=action-]:not(.hidden)").classList.add("hidden");
    document.getElementById(identifier).classList.remove("hidden");
};

const getSettingsFromUrl = (url) => {
    const values = url.hash.substring(1).split(",");

    try {
        if (values.length === 3 && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}(\/)?$/.test(values[0])) {
            const uuid = values[0];
            const key = nacl.util.decodeBase64(values[1]);
            const nonce = nacl.util.decodeBase64(values[2]);

            return {"uuid": uuid, "key": key, "nonce": nonce};
        }
    } catch (e) {
        console.log(`failed to parse '${values}: ${e}`);
        return null;
    }

    return null;
};

const checkAndSendText = (message) => {
    if (!(message && /\S/.test(message))) {
        alert("It seems there is either no or unsupported data in your clipboard.");
    } else {
        send(message);
    }
}

document.getElementById("btn-send").onclick = () => {
    rewriteDOM("action-send");
};

document.getElementById("btn-clipboard").onclick = () => {
    if (navigator.clipboard.readText) {
        navigator.clipboard.readText().then(message => {
           checkAndSendText(message); 
        });
    } else { 
        document.getElementById("content-manual-send").classList.remove("hidden");
    }
};

document.getElementById("area-manual-input").onpaste = (e) => {
    checkAndSendText(e.clipboardData.getData("text"));
};

document.getElementById("btn-receive").onclick = () => {
    const settings = {
        uuid: uuidv4(),
        key: nacl.randomBytes(nacl.secretbox.keyLength),
        nonce: nacl.randomBytes(nacl.secretbox.nonceLength)
    };

    if (ENVIRONMENT === "development") {
        console.log(`${location.origin}/#${settings.uuid},${nacl.util.encodeBase64(settings.key)},${nacl.util.encodeBase64(settings.nonce)}`);
    }

    qrgenerate(`${location.origin}/#${settings.uuid},${nacl.util.encodeBase64(settings.key)},${nacl.util.encodeBase64(settings.nonce)}`, (canvas) => {
        document.getElementById("action-qrcode").appendChild(canvas);
        rewriteDOM("action-qrcode");
    });

    listen(settings);
};

if (location.hash) {
    settings = getSettingsFromUrl(location);
    // Settings might still be stored in history (unless incognito), unfortunately there probably isn't a way around this.
    history.replaceState(null, null, " ");

    if (settings) {
        rewriteDOM("action-send");
    }
};
