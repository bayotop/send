const fs = require("fs");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const domain = process.env.SEND_APP_DOMAIN || "localhost";
const port = process.env.NODE_PORT || "3000";

const clients = {};
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/;
const SUPPORTED_CONTENT_TYPES = ["text/html", "text/css", "application/javascript"];

const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", (ws, request) => {
    const uuid = request.url.split("/").pop();

    if (!UUID_PATTERN.test(uuid)) {
        ws.terminate();
        return;
    }

    if (request.url.startsWith("/listen/")) {
        debug(`info: received listen from ${uuid}`);
        if (uuid in clients) {
            ws.terminate();
        }
        else {
            clients[uuid] = ws;
            ws.on("close", () => {
                delete clients[uuid];
            });
        }

        return;
    }

    if (request.url.startsWith("/send/")) {
        debug(`info: received send from ${uuid}`);
        ws.on("message", message => {
            if (uuid in clients) {
                var client = clients[uuid];
                if (client.readyState === WebSocket.OPEN) {
                    debug(`info: forwarding message to ${uuid}`);
                    client.send(message);
                }
                client.terminate();
            }
            else {
                console.log(`error: listener for ${uuid} is not available.`);
            }
            ws.terminate();
        });

        return;
    }

    console.log(`info: unexpected connection via ${request.url}`);
    ws.terminate();
});

const respond = (response, status_code, content) => {
    setSecurityHeaders(response);

    response.status_code = status_code;
    if (SUPPORTED_CONTENT_TYPES.includes(content.type)) {
        response.setHeader("Content-Type", content.type);
        fs.readFile(path.resolve(__dirname, content.source), (_, contents) => {
            response.write(contents);
            response.end();
        });

        return;
    }

    if (content.type == "text/plain") {
        response.setHeader("Content-Type", content.type);
        response.write(content.source);
        response.end();
        
        return;
    }

    throw Error(`Unsupported content type: ${content.type}`);
}; 

const server = http.createServer((request, response) => {
    if (request.url == "/") { 
        respond(response, 200, {type: "text/html", source: "../index.html"});
        return;
    }

    if (request.url == "/dist/bundle.js") {
        respond(response, 200, {type: "application/javascript", source: "../../dist/bundle.js"});
        return;
    }

    if (request.url == "/dist/qr-scanner-worker.min.js") {
        respond(response, 200, {type: "application/javascript", source: "../../dist/qr-scanner-worker.min.js"});
        return;
    }

    if (request.url == "/dist/main.css") {
        respond(response, 200, {type: "text/css", source: "../../dist/main.css"});
        return;
    }

    if (request.url.startsWith("/_/")) {
        const uuid = request.url.split("/").pop();

        if (!(UUID_PATTERN.test(uuid) && uuid in clients)) {
            respond(response, 404, {type: "text/plain", source: "The receiving end is not listening on this connection."});
        } else {
            respond(response, 200, {type: "text/html", source: "../index.html"});
        }

        return;
    }

    respond(response, 404, {type: "text/plain", source: "The requested resource doesn't exist."});

}).listen(port, "localhost", () => {
    console.log("Server running at http://localhost:" + port + "/");
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit("connection", socket, request);
    });
});

const debug = (message) => {
    if (process.env.NODE_ENV !== "production") {
        console.log(message);
    }
};

const setSecurityHeaders = (response) => {
    if (process.env.NODE_ENV === "production") {
        response.setHeader("Strict-Transport-Security", "max-age=63072000");
    }

    const websocketHost = (process.env.NODE_ENV === "production") ? `wss://${domain}` : `ws://localhost:${port}`;
    const upgradeToHttps = (process.env.NODE_ENV === "production") ? " upgrade-insecure-requests;" : "";

    response.setHeader("Content-Security-Policy", `default-src 'self'; connect-src ${websocketHost}; img-src data:; script-src 'self' 'unsafe-eval'; base-uri 'none';${upgradeToHttps} frame-ancestors 'none';`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-XSS-Protection", "0");
    //response.setHeader("Permissions-Policy", "");
};
