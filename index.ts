
import { Logger } from "./lib/logger";

import { initHttp } from "./lib/http";
import { initTunnel } from "./lib/tunnel";

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
    /** Enable verbose logging. */
    verbose?: boolean;
    /** Silent any logs. */
    silent?: boolean;
}

export interface ProxyServer {
    close(): void;
}

export function start(options: ProxyOptions = {}): ProxyServer {
    if (options.ntlm && options.basic) {
        console.error("/!\\ Can't use both `ntlm` and `basic` authentications at the same time!");
        process.exit(1);
    }

    const
        logger = new Logger(options),

        httpServer = initHttp(options, logger),
        httpsServer = initTunnel(options, logger);

    return {
        close() {
            httpServer.close();

            if (httpsServer) {
                httpsServer.close();
            }
        }
    };
}
