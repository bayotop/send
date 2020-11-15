import "../css/main.css";
import "../index.html";
import "../../routes.json";

import * as qr from "./qr";
import * as ws from "./ws";

const Nacl = require("tweetnacl");
Nacl.util = require("tweetnacl-util");

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
    const values = url.hash.substring(1).split(",");

    try {
        if (values.length === 3 && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}(\/)?$/.test(values[0])) {
            const uuid = values[0];
            const key = Nacl.util.decodeBase64(values[1]);
            const nonce = Nacl.util.decodeBase64(values[2]);

            return {"uuid": uuid, "key": key, "nonce": nonce};
        }
    } catch (e) {
        console.log(`failed to parse '${values}: ${e}`);
        return null;
    }

    return null;
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
        key: Nacl.randomBytes(Nacl.secretbox.keyLength),
        nonce: Nacl.randomBytes(Nacl.secretbox.nonceLength)
    };

    // eslint-disable-next-line no-undef
    if (ENVIRONMENT === "development") {
        console.log(`${location.origin}/#${settings.uuid},${Nacl.util.encodeBase64(settings.key)},${Nacl.util.encodeBase64(settings.nonce)}`);
    }

    qr.generate(`${location.origin}/#${settings.uuid},${Nacl.util.encodeBase64(settings.key)},${Nacl.util.encodeBase64(settings.nonce)}`, (canvas) => {
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
}