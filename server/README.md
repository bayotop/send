# Description

A simple WebSocket server that forwards encrypted data between two _send_ clients.

## Setup

An example setup using systemd and nginx as a reverse proxy (used at wss://ws.bayo.io) with a [Let's Encrypt](https://letsencrypt.org/) certificate managed via [Certbot](https://certbot.eff.org/):

***send-prod-env.service***
```
[Unit]
Description=send/app.js - secure data sharing via websockets
Documentation=https://github.com/bayotop/send
After=network.target

[Service]
Environment=NODE_PORT=8080
Type=simple
User=www-data
ExecStart=/usr/bin/node /var/www/ws.bayo.io/server/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

***ws.bayo.io.conf***
```
server {
    server_name ws.bayo.io;

    access_log /var/log/nginx/ws.bayo.io.access.log;
    error_log /var/log/nginx/ws.bayo.io.error.log;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/ws.bayo.io/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/ws.bayo.io/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = ws.bayo.io) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    listen [::]:80;

    server_name ws.bayo.io;

    return 404; # managed by Certbot
}
```
