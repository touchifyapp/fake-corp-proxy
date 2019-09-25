
import * as URL from "url";
import * as http from "http";

import * as express from "express";
import * as httpProxy from "http-proxy";

import { Logger } from "./logger";

import { handleNtlm } from "./ntlm";
import { handleBasic } from "./basic";

import { ProxyOptions } from "..";

export function initHttp(options: ProxyOptions, logger: Logger): http.Server {
    const
        app = express(),
        proxy = httpProxy.createProxyServer({}),

        port = options.port || 8080;

    app.get("/pac", (req, res) => {
        res.header("Content-Type", "application/x-ns-proxy-autoconfig")
            .send(createPacScript(port));
    });

    if (options.ntlm) {
        logger.verbose("STARTUP> HTTP Proxy use NTLM authentication");

        app.use((req, res, next) => {
            handleNtlm(req, res, next, logger);
        });
    }

    if (options.basic) {
        logger.verbose("STARTUP> HTTP Proxy use Basic authentication");

        app.use((req, res, next) => {
            handleBasic(req, res, next, logger);
        });
    }

    app.all("*", (req, res) => {
        logger.log(`PROXY>   ${new Date().toJSON()}\t${req.httpVersion}\t${req.method}\t${req.url}`);

        const url = URL.parse(req.url);

        proxy.web(req, res, {
            target: {
                protocol: url.protocol,
                host: url.host,
                port: url.port
            }
        });
    });

    proxy.on("error", (err, req /*, res, target */) => {
        logger.log(`PROXY>   Error while proxying request ${req.method} ${req.url}:`, err);
    });

    return http.createServer(app).listen(port, () => {
        logger.log(`STARTUP> HTTP Proxy listening on port ${port}...`);
    });
}

function createPacScript(port: number): string {
    return `function FindProxyForURL(url, host) {
    if (url.substring(0, 5) == "http:") {
        return "PROXY localhost:${port}";
    }
    else if (url.substring(0, 6) == "https:") {
        return "PROXY localhost:${port + 1}";
    }
    else {
        return "DIRECT";
    }
}`;
}