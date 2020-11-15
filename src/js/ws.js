const nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");

// eslint-disable-next-line no-undef
const protocol = (ENVIRONMENT === "development") ? "ws://" : "wss://";

export const send = (message, settings, callback) => {
    const socket = new WebSocket(`${protocol}${location.host}/send/${settings.uuid}`);
    socket.onopen = () => {
        const encrypted = nacl.util.encodeBase64(
            nacl.secretbox(nacl.util.decodeUTF8(message), settings.nonce, settings.key)
        );

        socket.send(encrypted);
        callback();
    };
};

export const listen = (settings, callback) => {
    const socket = new WebSocket(`${protocol}${location.host}/listen/${settings.uuid}`);
    socket.onmessage = (event) => {
        callback(
            nacl.util.encodeUTF8(
                nacl.secretbox.open(nacl.util.decodeBase64(event.data), settings.nonce, settings.key))
        );
    };
};
