import { IncomingMessage } from "http";
import { Readable } from "stream";

import { handleNtlm } from "./ntlm";
import { handleBasic } from "./basic";

import { Logger } from "./logger";
import { ServerManager, ServerInfo } from "./mitm";
import { createProxyHandler } from "./proxy";

import {
    Socket,

    writeChunck,
    writeResponse,
    connect,
    startRead,
    tunnel
} from "./socket";

export type TunnelMiddleware = (req: IncomingMessage, clientSocket: Socket) => Promise<boolean>;
export type TunnelHandler = (req: IncomingMessage, clientSocket: Socket) => any;

export interface TunnelOptions {
    basic?: boolean;
    ntlm?: boolean;
}

export function createTunnelHandler(options: TunnelOptions, logger: Logger): TunnelHandler {
    const
        mitm = new ServerManager(logger, createProxyHandler({ port: -1, noPac: true }, logger)),
        middlewares: TunnelMiddleware[] = [];

    if (options.ntlm) {
        logger.verbose("STARTUP> HTTPS Tunnel use NTLM authentication");
        middlewares.push((req, sock) => handleNtlm(req, sock, noop, logger));
    }

    if (options.basic) {
        logger.verbose("STARTUP> HTTPS Tunnel use Basic authentication");
        middlewares.push((req, sock) => handleBasic(req, sock, noop, logger));
    }

    return (req, clientSocket) => {
        handleTunnel(req, clientSocket, middlewares.slice(), mitm, logger);
    };
}

async function handleTunnel(req: IncomingMessage, clientSocket: Socket, middlewares: TunnelMiddleware[], mitm: ServerManager, logger: Logger): Promise<void> {
    const ok = await executeMiddlewares(middlewares, req, clientSocket);
    if (!ok) return;

    logger.log(`TUNNEL>  ${new Date().toJSON()}\t${req.httpVersion}\t${req.method}\t${req.url}`);

    const { host } = getServerInfo(req);

    try {
        await writeChunck(clientSocket, `HTTP/${req.httpVersion} 200 OK\r\n\r\n`);

        const reqStrem = new CommonReadableStream();
        await startRead(clientSocket, reqStrem);

        const
            internalServer = await mitm.getHttpsServer(host),
            remoteSocket = await connect(internalServer);

        await tunnel(reqStrem, remoteSocket, clientSocket);
    }
    catch (err) {
        logger.log("TUNNEL>  Error:", err);

        await writeResponse(clientSocket, "1.1", 502, {
            "Proxy-Error": "true",
            "Proxy-Error-Message": String(err),
            "Content-Type": "text/html"
        });
    }
}

async function executeMiddlewares(middlewares: TunnelMiddleware[], req: IncomingMessage, clientSocket: Socket): Promise<boolean> {
    const middleware = middlewares.shift();

    if (!middleware) {
        return true;
    }

    const ok = await middleware(req, clientSocket);
    if (ok) {
        return await executeMiddlewares(middlewares, req, clientSocket);
    }

    return false;
}

function getServerInfo(req: IncomingMessage): ServerInfo {
    const [host, port] = req.url!.split(":");
    return { host, port: parseInt(port) };
}

function noop(): void {
    // void;
}

const DEFAULT_CHUNK_COLLECT_THRESHOLD = 20 * 1024 * 1024; // about 20 mb

class CommonReadableStream extends Readable {
    constructor() {
        super({
            highWaterMark: DEFAULT_CHUNK_COLLECT_THRESHOLD * 5
        });
    }

    _read() { }
}