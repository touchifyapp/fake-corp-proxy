import {
    IncomingMessage,
    ResponseOrSocket,
    write
} from "./util";

import {
    Logger
} from "./logger";

export function handleBasic(req: IncomingMessage, res: ResponseOrSocket, next: Function, logger: Logger): Promise<boolean> {
    const authHeader = req.headers["proxy-authorization"];
    if (!authHeader) {
        logger.verbose(`BASIC> Error 407: Got unauthenticated request: ${req.method} ${req.url}`);
        return write(req, res, 407, { "Proxy-Authenticate": "Basic" }).then(() => false);
    }

    const authData = decodeBasicAuthorizationHeader(authHeader);
    if (!authData) {
        logger.verbose("BASIC> Error 400: Proxy-Authorization header invalid or not present", req.headers);
        return write(req, res, 400).then(() => false);
    }

    return handleAuthenticate(req, res, next, logger, authData);
}

function handleAuthenticate(req: IncomingMessage, res: ResponseOrSocket, next: Function, logger: Logger, [user, password]: [string, string]): Promise<boolean> {
    if (!user || !password) {
        logger.verbose("BASIC> Error 403: Missing username or password");
        return write(req, res, 403).then(() => false);
    }

    const userData = {
        user,
        password,
        authenticated: !user.startsWith("unknown")
    };

    (req as any).basic = userData;
    (req as any).connection.basic = userData;

    if (!userData.authenticated) {
        logger.verbose(`BASIC> Error 403: Unknown user: ${user}`);
        return write(req, res, 403).then(() => false);
    }

    logger.verbose("BASIC> Authentication successful", JSON.stringify(userData));

    next();
    return Promise.resolve(true);
}

function decodeBasicAuthorizationHeader(header: string): [string, string] | undefined {
    const ah = header.split(" ");
    if (ah.length !== 2 && ah[0] !== "Basic") {
        return;
    }

    let value = ah[1];
    if (!value.includes(":")) {
        value = Buffer.from(ah[1], "base64").toString("utf8");
    }

    const up = value.split(":");
    if (up.length !== 2) {
        return;
    }

    return up as [string, string];
}
