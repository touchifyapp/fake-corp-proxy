
import * as http from "http";
import * as https from "https";

import { Logger } from "./lib/logger";
import { getCertificate } from "./lib/certificates";

import { createProxyHandler } from "./lib/proxy";
import { TunnelHandler, createTunnelHandler } from "./lib/tunnel";

export interface ProxyOptions {
    /** Server port. */
    port: number;
    /** Enable Basic Authentication. */
    basic?: boolean;
    /** Enable NTLM Authentication. */
    ntlm?: boolean;
    /** Enable HTTPS Server. */
    https?: boolean;
    /** Enable verbose logging. */
    verbose?: boolean;
    /** Silent any logs. */
    silent?: boolean;
}

export interface ProxyServer {
    close(): void;
}

export async function start(options: ProxyOptions = { port: 8080 }): Promise<ProxyServer> {
    if (options.ntlm && options.basic) {
        console.error("/!\\ Can't use both `ntlm` and `basic` authentications at the same time!");
        process.exit(1);
    }

    const
        logger = new Logger(options),

        proxyHandler = createProxyHandler(options, logger),
        tunnelHandler = createTunnelHandler(options, logger),

        httpServer = createHttpServer(options, logger, proxyHandler, tunnelHandler),
        httpsServer = options.https ? await createHttpsServer(options, logger, proxyHandler, tunnelHandler) : null;

    return {
        close() {
            httpServer.close();

            if (httpsServer) {
                httpsServer.close();
            }
        }
    };
}

function createHttpServer(options: ProxyOptions, logger: Logger, proxyHandler: http.RequestListener, tunnelHandler: TunnelHandler): http.Server {
    const server = http.createServer(proxyHandler).listen(options.port, () => {
        logger.log(`STARTUP> HTTP Proxy listening on port ${options.port}...`);
    });

    server.on("connect", tunnelHandler);

    return server;
}

async function createHttpsServer(options: ProxyOptions, logger: Logger, proxyHandler: http.RequestListener, tunnelHandler: TunnelHandler): Promise<https.Server> {
    const
        port = options.port + 1,
        { keyContent, certContent } = await getCertificate("localhost");

    const server = https.createServer({ key: keyContent, cert: certContent }, proxyHandler).listen(port, () => {
        logger.log(`STARTUP> HTTPS Proxy listening on port ${port}...`);
    });

    server.on("connect", tunnelHandler);

    return server;
}
