import {
    Request,
    Response
} from "express";

export function handleBasic(req: Request, res: Response, next: Function): void {
    const authHeader = req.headers["proxy-authorization"];
    if (!authHeader) {
        console.log(`Got unauthenticated request: ${req.method} ${req.url}, returning 407!`);

        res.status(407)
            .header("Proxy-Authenticate", "Basic")
            .send();

        return;
    }

    const authData = decodeBasicAuthorizationHeader(authHeader);
    if (!authData) {
        console.log("Error 400: Proxy-Authorization header not valid", req.headers);
        res.status(400).send();
        return;
    }

    handleAuthenticate(req, res, next, authData);
}

function handleAuthenticate(req: Request, res: Response, next: Function, [user, password]: [string, string]): void {
    if (user !== "username" || password !== "password") {
        res.status(403).send();
        return;
    }

    // if we were going to do proper authentication, here"s where it would happen.
    const authenticated = !user.startsWith("unauth");

    const userData = {
        user,
        authenticated
    };

    (req as any).basic = userData;
    (req as any).connection.basic = userData;

    if (!authenticated) {
        res.status(403).send();
        return;
    }

    return next();
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
