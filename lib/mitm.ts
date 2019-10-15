import * as https from "https";
import * as net from "net";
import * as constants from "constants";
import { RequestListener } from "http";
import {
    SecureContext,
    createSecureContext
} from "tls";

import * as certs from "./certificates";
import { Logger } from "./logger";

export interface ServerInfo {
    host: string;
    port: number;
}

export class ServerManager {
    private logger: Logger;
    private handler: RequestListener;
    private servers = new Map<string, Promise<ServerInfo>>();

    constructor(logger: Logger, handler: RequestListener) {
        this.logger = logger;
        this.handler = handler;
    }

    public getHttpsServer(hostname: string): Promise<ServerInfo> {
        const
            isIP = isIPDomain(hostname),
            res: ServerInfo = { host: isIP ? hostname : "127.0.0.1", port: 0 };

        let prom = this.servers.get(res.host);
        if (prom) {
            return prom;
        }

        prom = getFreePort()
            .then(port => {
                res.port = port;

                return isIP ?
                    createIPHttpsServer(hostname, port, this.handler, this.logger) :
                    createInternalHttpsServer(port, this.handler, this.logger);
            })
            .then(() => res);

        this.servers.set(res.host, prom);

        return prom;
    }
}

async function createInternalHttpsServer(port: number, handler: RequestListener, logger: Logger): Promise<https.Server> {
    const { keyContent, certContent } = await certs.getCertificate("fake-corp-proxy-internal-https");

    return https.createServer({
        secureOptions: constants.SSL_OP_NO_SSLv3 || constants.SSL_OP_NO_TLSv1,
        SNICallback: prepareSNICert.bind(null, logger) as any,
        key: keyContent,
        cert: certContent
    }, handler).listen(port);
}

async function createIPHttpsServer(ip: string, port: number, handler: RequestListener, logger: Logger): Promise<https.Server> {
    const { keyContent, certContent } = await certs.getCertificate(ip);

    return https.createServer({
        secureOptions: constants.SSL_OP_NO_SSLv3 || constants.SSL_OP_NO_TLSv1,
        key: keyContent,
        cert: certContent
    }, handler).listen(port);
}

function prepareSNICert(logger: Logger, serverName: string, callback: (err: Error | null, ctx?: SecureContext) => void): void {
    certs.getCertificate(serverName)
        .then(({ keyContent, certContent }) => createSecureContext({
            key: keyContent,
            cert: certContent
        }))
        .then(ctx => {
            logger.verbose(`CERT>    SNI Certificate for host: ${serverName} generated!`)
            callback(null, ctx);
        })
        .catch(err => {
            logger.log(`CERT>    Error while generating SNI certificate for host: ${serverName}`, err);
            callback(err);
        });
}

function isIPDomain(domain: string): boolean {
    return !!domain && /^\d+?\.\d+?\.\d+?\.\d+?$/.test(domain);
}

function getFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, () => {
            const addr = server.address();
            if (!addr || typeof addr === "string") {
                return server.close(() => { reject(new Error("Can't parse new free port!")); });
            }

            const port = addr.port;
            server.close(() => { resolve(port); });
        });
    });
}
