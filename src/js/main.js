import "../css/main.css";
import * as qr from "./qr";
import * as ws from "./ws";

const nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");

const { v4: uuidv4 } = require("uuid");

const send = (data) => {
    const _send = (url) => {
        let uuid = url.pathname.split("/").pop();
        let [key, nonce] = url.hash.substring(1).split(",").map(v => nacl.util.decodeBase64(v));

        ws.send({"uuid": uuid, "key": key, "nonce": nonce, "data": data}, () => {
            location.href="/";
        });
    };

    if (location.pathname.startsWith("/_/")) {
        _send(location);
    } else {
        rewriteDOM("action-scan");
        qr.scan(document.querySelector("video"), _send);
    }
};

const listen = (options) => {
    ws.listen(options, (data) => {
        document.getElementById("result").textContent = data;
        rewriteDOM("action-received");
    });
};

const rewriteDOM = (identifier) => {
    document.querySelector("div[id^=action-]:not(.hidden)").classList.add("hidden");
    document.getElementById(identifier).classList.remove("hidden");
};

document.getElementById("btn-send").onclick = () => {
    rewriteDOM("action-send");

    document.getElementById("btn-send-data").onclick = () => {
        const data = document.getElementById("area-data").value;
        if (!(data && /\S/.test(data))) {
            alert("You need to first enter some text to be sent.");
        } else {
            send(data);
        }  
    };

    document.getElementById("btn-clipboard").onclick = () => {
        navigator.clipboard.readText().then(data => {
            if (!(data && /\S/.test(data))) {
                alert("It seems there is either no or unsupported data in your clipboard.");
            } else {
                send(data);
            }
        });
    };
};

document.getElementById("btn-receive").onclick = () => {
    const options = {
        uuid: uuidv4(),
        key: nacl.randomBytes(nacl.secretbox.keyLength),
        nonce: nacl.randomBytes(nacl.secretbox.nonceLength)
    };

    // eslint-disable-next-line no-undef
    if (ENVIRONMENT === "development") {
        console.log(`${location.origin}/_/${options.uuid}#${nacl.util.encodeBase64(options.key)},${nacl.util.encodeBase64(options.nonce)}`);
    }

    qr.generate(`${location.origin}/_/${options.uuid}#${nacl.util.encodeBase64(options.key)},${nacl.util.encodeBase64(options.nonce)}`, (canvas) => {
        document.getElementById("action-qrcode").appendChild(canvas);
        rewriteDOM("action-qrcode");
    });

    listen(options);
};

if (/^\/_\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}(\/)?$/.test(location.pathname)) {
    document.getElementById("btn-send").click();
}
