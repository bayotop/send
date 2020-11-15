const http = require("http");
const WebSocket = require("ws");

const port = process.env.NODE_PORT || "3001";

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/;

const listeners = {};

const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", (ws, request) => {
    const [action, uuid] = request.url.substring(1).split("/");

    if (!UUID_PATTERN.test(uuid)) {
        ws.close();
        return;
    }

    switch (action) {
    case "listen":
        debug(`info: received listen from ${uuid}`);
        if (uuid in listeners) {
            ws.close();
        }
        else {
            listeners[uuid] = ws;
            ws.on("close", () => {
                debug(`info: closing ${uuid}`);
                delete listeners[uuid];
            });
        }
        break;
    case "send":
        debug(`info: received send to ${uuid}`);
        ws.on("message", message => {
            if (uuid in listeners) {
                const listener = listeners[uuid];
                if (listener.readyState === WebSocket.OPEN) {
                    debug(`info: forwarding message to ${uuid}`);
                    listener.send(message);
                }
                listener.close();
            }
            else {
                console.log(`error: listener for ${uuid} is not available.`);
            }
            ws.close();
        });
        break;
    default:
        console.log(`info: unexpected connection via ${request.url}`);
        ws.close();
    }
});

const setSecurityHeaders = (response) => {
    if (!process.env.DEBUG) {
        response.setHeader("Strict-Transport-Security", "max-age=63072000");
    }

    response.setHeader("Content-Security-Policy", `default-src 'none'; frame-ancestors 'none';`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-XSS-Protection", "0");
    //response.setHeader("Permissions-Policy", "");
};

const server = http.createServer((_, response) => {
    setSecurityHeaders(response);
    response.write("OK");
    response.end();
}).listen(port, "localhost", () => {
    console.log("Server running at http://localhost:" + port + "/");
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit("connection", socket, request);
    });
});

const debug = (message) => {
    if (process.env.DEBUG) {
        console.log(message);
    }
};
