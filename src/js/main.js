import "../css/main.css";
import * as qr from "./qr";
import * as ws from "./ws";

const nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");

const { v4: uuidv4 } = require("uuid");

var settings = null;

const send = (message) => {
    const _redirect = () => {
        window.settings = settings = {};
        location.href="/";
    };

    if (settings) {
        ws.send(message, settings, _redirect);
    } else {
        rewriteDOM("action-scan");
        qr.scan(document.querySelector("video"), (url) => {
            ws.send(message, getSettingsFromUrl(url), _redirect);
        });
    }
};

const listen = (settings) => {
    ws.listen(settings, (data) => {
        document.getElementById("result").textContent = data;
        rewriteDOM("action-received");
    });
};

const rewriteDOM = (identifier) => {
    document.querySelector("div[id^=action-]:not(.hidden)").classList.add("hidden");
    document.getElementById(identifier).classList.remove("hidden");
};

const getSettingsFromUrl = (url) => {
    const uuid = url.pathname.split("/").pop();
    const [key, nonce] = url.hash.substring(1).split(",").map(v => nacl.util.decodeBase64(v));

    return {"uuid": uuid, "key": key, "nonce": nonce};
};

document.getElementById("btn-send").onclick = () => {
    rewriteDOM("action-send");
};

document.getElementById("btn-send-message").onclick = () => {
    const message = document.getElementById("area-message").value;
    if (!(message && /\S/.test(message))) {
        alert("You need to first enter some text to be sent.");
    } else {
        send(message);
    }  
};

document.getElementById("btn-clipboard").onclick = () => {
    navigator.clipboard.readText().then(message => {
        if (!(message && /\S/.test(message))) {
            alert("It seems there is either no or unsupported data in your clipboard.");
        } else {
            send(message);
        }
    });
};

document.getElementById("btn-receive").onclick = () => {
    const settings = {
        uuid: uuidv4(),
        key: nacl.randomBytes(nacl.secretbox.keyLength),
        nonce: nacl.randomBytes(nacl.secretbox.nonceLength)
    };

    // eslint-disable-next-line no-undef
    if (ENVIRONMENT === "development") {
        console.log(`${location.origin}/_/${settings.uuid}#${nacl.util.encodeBase64(settings.key)},${nacl.util.encodeBase64(settings.nonce)}`);
    }

    qr.generate(`${location.origin}/_/${settings.uuid}#${nacl.util.encodeBase64(settings.key)},${nacl.util.encodeBase64(settings.nonce)}`, (canvas) => {
        document.getElementById("action-qrcode").appendChild(canvas);
        rewriteDOM("action-qrcode");
    });

    listen(settings);
};

if (/^\/_\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}(\/)?$/.test(location.pathname)) {
    settings = getSettingsFromUrl(location);
    // Settings might still be stored in history (unless incognito), unfortunately there probably isn't a way around this.
    history.replaceState(null, null, " ");

    rewriteDOM("action-send");
} else if (location.pathname !== "/") {
    location.href = "/";
}
