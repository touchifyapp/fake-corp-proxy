
import * as URL from "url";

import * as express from "express";
import * as httpProxy from "http-proxy";
import { RequestListener } from "http";

import { Logger } from "./logger";

import { handleNtlm } from "./ntlm";
import { handleBasic } from "./basic";

export interface ProxyHandlerOptions {
    port: number;
    basic?: boolean;
    ntlm?: boolean;
    noPac?: boolean;
}

export function createProxyHandler(options: ProxyHandlerOptions, logger: Logger): RequestListener {
    const
        app = express(),
        proxy = httpProxy.createProxyServer({});

    if (!options.noPac) {
        app.get("/proxy.pac", (req, res) => {
            logger.log(`PROXY>   ${new Date().toJSON()}\t${req.httpVersion}\t${req.method}\t${req.url}`);

            res.header("Content-Type", "application/x-ns-proxy-autoconfig")
                .send(createPacScript(options.port, isSecured(req)));
        });
    }

    const middlewares: express.RequestHandler[] = [];

    if (options.ntlm) {
        logger.verbose("STARTUP> HTTP Proxy use NTLM authentication");

        middlewares.push((req, res, next) => {
            handleNtlm(req, res, next, logger);
        });
    }

    if (options.basic) {
        logger.verbose("STARTUP> HTTP Proxy use Basic authentication");

        middlewares.push((req, res, next) => {
            handleBasic(req, res, next, logger);
        });
    }

    app.all("*", ...middlewares, (req, res) => {
        logger.log(`PROXY>   ${new Date().toJSON()}\t${req.httpVersion}\t${req.method}\t${req.url}`);

        const
            protocol = isSecured(req) ? "https" : "http",
            fullUrl = protocol === "http" ? req.url : `${protocol}://${req.headers.host}${req.url}`,

            url = URL.parse(fullUrl);

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

    return app;
}

function createPacScript(port: number, isSecured: boolean): string {
    port = isSecured ? port + 1 : port;
    return `function FindProxyForURL(url, host) {
    if (url.substring(0, 4) == "http") {
        return "PROXY localhost:${port}";
    }
    else {
        return "DIRECT";
    }
}`;
}

function isSecured(req: express.Request): boolean {
    return (!!req.secure && !(/^http:/).test(req.url))
}