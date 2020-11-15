const Nacl = require("tweetnacl");
Nacl.util = require("tweetnacl-util");

// eslint-disable-next-line no-undef
export const websocketHost = (ENVIRONMENT === "development") ? "ws://localhost:3001" : WS_HOST;

export const send = (message, settings, callback) => {
    const socket = new WebSocket(`${websocketHost}/send/${settings.uuid}`);
    socket.onopen = () => {
        const encrypted = Nacl.util.encodeBase64(
            Nacl.secretbox(Nacl.util.decodeUTF8(message), settings.nonce, settings.key)
        );

        socket.send(encrypted);
        callback();
    };
};

export const listen = (settings, callback) => {
    const socket = new WebSocket(`${websocketHost}/listen/${settings.uuid}`);
    socket.onmessage = (event) => {
        callback(
            Nacl.util.encodeUTF8(
                Nacl.secretbox.open(Nacl.util.decodeBase64(event.data), settings.nonce, settings.key))
        );
    };
};
