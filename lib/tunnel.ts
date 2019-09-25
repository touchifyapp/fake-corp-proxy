import * as fs from "fs";
import * as https from "https";
import { IncomingMessage } from "http";

import { handleNtlm } from "./ntlm";
import { handleBasic } from "./basic";

import { ProxyOptions } from "..";
import { Logger } from "./logger";

import {
    Socket,
    SocketConnectOpts,

    writeChunck,
    connect,
    pipe
} from "./socket";

export type TunnelMiddleware = (req: IncomingMessage, clientSocket: Socket) => Promise<boolean>;

export function initTunnel(options: ProxyOptions, logger: Logger): https.Server | undefined {
    if (!options.https) {
        return;
    }

    if (!options.key || !options.cert) {
        console.error(`/!\\ WARN: A certificate file and a key file must be provided to start a HTTPS server!`);
        process.exit(1);
        return;
    }

    const
        middlewares: TunnelMiddleware[] = [],
        port = options.port ? options.port + 1 : 8081,

        opts: https.ServerOptions = {
            key: fs.readFileSync(options.key),
            cert: fs.readFileSync(options.cert)
        };

    if (options.ntlm) {
        logger.verbose("STARTUP> HTTPS Tunnel use NTLM authentication");
        middlewares.push((req, sock) => handleNtlm(req, sock, noop, logger));
    }

    if (options.basic) {
        logger.verbose("STARTUP> HTTPS Tunnel use Basic authentication");
        middlewares.push((req, sock) => handleBasic(req, sock, noop, logger));
    }

    const server = https.createServer(opts).listen(port, () => {
        logger.log(`STARTUP> HTTPS Proxy listening on port ${port}...`);
    });

    server.on("connect", (req, clientSocket) => {
        handleTunnel(req, clientSocket, middlewares.slice(), logger);
    });

    return server;
}

function handleTunnel(req: IncomingMessage, clientSocket: Socket, middlewares: TunnelMiddleware[], logger: Logger): void {
    executeMiddlewares(middlewares, req, clientSocket).then(res => {
        if (!res) return;

        logger.log(`TUNNEL>  ${new Date().toJSON()}\t${req.httpVersion}\t${req.method}\t${req.url}`);

        return writeChunck(clientSocket, `HTTP/${req.httpVersion} 200 OK\r\n\r\n`)
            .then(() => connect(getConnectOptions(req)))
            .then(remoteSocket => pipe(clientSocket, remoteSocket))
            .catch(err => {
                logger.log("TUNNEL>  Error:", err);
            });
    });
}

function executeMiddlewares(middlewares: TunnelMiddleware[], req: IncomingMessage, clientSocket: Socket): Promise<boolean> {
    const middleware = middlewares.shift();

    if (!middleware) {
        return Promise.resolve(true);
    }

    return middleware(req, clientSocket)
        .then(res => {
            if (!res) return res;
            return executeMiddlewares(middlewares, req, clientSocket);
        });
}

function getConnectOptions(req: IncomingMessage): SocketConnectOpts {
    const [host, port] = req.url!.split(":");
    return { host, port: parseInt(port) };
}

function noop(): void {
    // void;
}
