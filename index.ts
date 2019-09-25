import * as URL from "url";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";

import * as express from "express";
import * as httpProxy from "http-proxy";

import { handleNtlm } from "./lib/ntlm";
import { handleBasic } from "./lib/basic";

export interface ProxyOptions {
    /** Server port. */
    port?: number;
    /** Enable Basic Authentication. */
    basic?: boolean;
    /** Enable NTLM Authentication. */
    ntlm?: boolean;
    /** Enable HTTPS Server. */
    https?: boolean;
    /** Key path for HTTPS server. */
    key?: string;
    /** Certificate path for HTTPS server */
    cert?: string;
}

export interface ProxyServer {
    close(): void;
}

export function start(options: ProxyOptions = {}): ProxyServer {
    const
        app = express(),
        proxy = httpProxy.createProxyServer({});

    app.set("port", options.port || 8080);
    app.set("https-port", app.get("port") + 1);

    if (options.ntlm) {
        console.log("Proxy use NTLM authentication!");
        app.use(handleNtlm);
    }

    if (options.basic) {
        console.log("Proxy use Basic authentication!");
        app.use(handleBasic);
    }

    app.all("*", (req, res) => {
        console.log(`PROXY\t${new Date().toJSON()}\t${req.httpVersion}\t${req.method}\t${req.url}`);

        const url = URL.parse(req.url);

        proxy.web(req, res, {
            target: {
                protocol: url.protocol,
                host: url.host,
                port: url.port
            }
        });
    });

    proxy.on("error", (err, req, res, target) => {
        console.log(`Proxy error during method ${req.method} ${req.url}:`, err);
        console.log("Using target", target);
    });

    const httpServer = http.createServer(app).listen(app.get("port"), () => {
        console.log(`HTTP Proxy listening on port ${app.get("port")}...`);
    });

    let httpsServer: https.Server;
    if (options.https) {
        if (!options.key || !options.cert) {
            console.error(`/!\\ WARN: A certificate file and a key file must be provided to start a HTTPS server!`);
            process.exit(1);
            throw null;
        }

        const opts: https.ServerOptions = {
            key: fs.readFileSync(options.key),
            cert: fs.readFileSync(options.cert)
        };

        httpsServer = https.createServer(opts, app).listen(app.get("https-port"), () => {
            console.log(`HTTPS Proxy listening on port ${app.get("https-port")}...`);
        });
    }

    return {
        close() {
            httpServer.close();

            if (httpsServer) {
                httpsServer.close();
            }
        }
    };
}
