const fs = require("fs");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const IS_PRODUCTION = process.env.NODE_ENV !== "development";
console.log(
    `Initialising ${IS_PRODUCTION ? "production" : "development"} configuration (process.env.NODE_ENV is ${process.env.NODE_ENV})`
);

const DOMAIN = IS_PRODUCTION ? process.env.SEND_APP_DOMAIN : "localhost";
const PORT = IS_PRODUCTION ? process.env.NODE_PORT : "3000";

if (!(DOMAIN && PORT)) {
    throw Error("the process.env.SEND_APP_DOMAIN and process.env.NODE_PORT environment variables need to be set");
}

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/;
const SUPPORTED_CONTENT_TYPES = ["text/html", "text/css", "application/javascript"];

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

const respond = (response, status_code, content) => {
    setSecurityHeaders(response);

    response.statusCode = status_code;

    if (!content) {
        response.end();
        return;
    }

    if (SUPPORTED_CONTENT_TYPES.includes(content.type)) {
        response.setHeader("Content-Type", content.type);
        fs.readFile(path.resolve(__dirname, content.source), (_, contents) => {
            response.write(contents);
            response.end();
        });

        return;
    }

    throw Error(`Unsupported content type: ${content.type}`);
}; 

const setSecurityHeaders = (response) => {
    if (DOMAIN !== "localhost") {
        response.setHeader("Strict-Transport-Security", "max-age=63072000");
    }

    const websocketHost = (DOMAIN === "localhost") ? `ws://${DOMAIN}:${PORT}` : `wss://${DOMAIN}`;
    const upgradeToHttps = (DOMAIN === "localhost") ?  "" : " upgrade-insecure-requests;";

    response.setHeader("Content-Security-Policy", `default-src 'self'; connect-src ${websocketHost}; img-src data:; script-src 'self' 'unsafe-eval'; base-uri 'none';${upgradeToHttps} frame-ancestors 'none';`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-XSS-Protection", "0");
    //response.setHeader("Permissions-Policy", "");
};

const server = http.createServer((request, response) => {
    if (request.method !== "GET") {
        respond(response, 405);
        return;
    }

    if (request.url === "/" || request.url.startsWith("/_/")) {
        respond(response, 200, {type: "text/html", source: "../index.html"});
        return;
    }

    if (request.url === "/dist/bundle.js") {
        respond(response, 200, {type: "application/javascript", source: "../../dist/bundle.js"});
        return;
    }

    if (request.url === "/dist/qr-scanner-worker.min.js") {
        respond(response, 200, {type: "application/javascript", source: "../../dist/qr-scanner-worker.min.js"});
        return;
    }

    if (request.url === "/dist/main.css") {
        respond(response, 200, {type: "text/css", source: "../../dist/main.css"});
        return;
    }

    respond(response, 404);

}).listen(PORT, "localhost", () => { // always run on localhost (production is expected to be behind a reverse proxy)
    console.log("Server running at http://localhost:" + PORT + "/");
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit("connection", socket, request);
    });
});

const debug = (message) => {
    if (!IS_PRODUCTION) {
        console.log(message);
    }
};
