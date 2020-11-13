const nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");

// eslint-disable-next-line no-undef
const protocol = (ENVIRONMENT === "development") ? "ws://" : "wss://";

export const send = (message) => {
    var socket = new WebSocket(`${protocol}${location.host}/send/${message.uuid}`);
    socket.onopen = () => {
        let data = {
            message: nacl.util.encodeBase64(nacl.secretbox(nacl.util.decodeUTF8(message.data), message.nonce, message.key))
        };

        socket.send(JSON.stringify(data));
        socket.close();
    };
};

export const listen = (options, callback) => {
    var socket = new WebSocket(`${protocol}${location.host}/listen/${options.uuid}`);
    socket.onmessage = (event) => {
        callback(
            nacl.util.encodeUTF8(nacl.secretbox.open(nacl.util.decodeBase64(JSON.parse(event.data).message), options.nonce, options.key))
        );
        socket.close();
    };
};