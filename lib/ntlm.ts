import {
    IncomingMessage,
    ResponseOrSocket,
    write
} from "./util";

import {
    Logger
} from "./logger";

export function handleNtlm(req: IncomingMessage, res: ResponseOrSocket, next: Function, logger: Logger): Promise<boolean> {
    const authHeaders = req.headers["proxy-authorization"];
    if (!authHeaders) {
        logger.verbose(`NTLM> Error 407: Got unauthenticated request: ${req.method} ${req.url}`);
        return write(req, res, 407, { "Proxy-Authenticate": "NTLM" }).then(() => false);
    }

    const authData = decodeHttpAuthorizationHeader(authHeaders);
    if (!authData) {
        logger.verbose("NTLM> Error 400: Proxy-Authorization header invalid or not present:", req.headers);
        return write(req, res, 400).then(() => false);
    }

    try {
        const messageType = decodeMessageType(authData[1]);

        switch (messageType) {
            case 1:
                logger.verbose(`NTLM> Received NEGOTIATE: Proxy-Authorization: ${authHeaders}`);
                return handleNegotiate(req, res);

            case 3:
                logger.verbose(`NTLM> Received AUTHENTICATE: Proxy-Authorization: ${authHeaders}`);
                return handleAuthenticate(req, res, next, logger, authData[1]);
        }

        logger.verbose(`NTLM> Error 400: Unknown authorization message type: ${messageType}`);
        return write(req, res, 400).then(() => false);
    }
    catch (err) {
        logger.verbose("NTLM> Error 400:", err);
        return write(req, res, 400).then(() => false);
    }
}


function handleNegotiate(req: IncomingMessage, res: ResponseOrSocket): Promise<boolean> {
    const challenge = fakeNtlmChallenge();

    return write(req, res, 407, { "Proxy-Authenticate": "NTLM " + challenge.toString("base64") }).then(() => false);
}

function handleAuthenticate(req: IncomingMessage, res: ResponseOrSocket, next: Function, logger: Logger, ntlmMessage: Buffer): Promise<boolean> {
    const [user, domain, workstation] = parseNtlmAuthenticate(ntlmMessage);

    const userData = {
        domain,
        user,
        workstation,
        authenticated: !user.startsWith("unknown")
    };

    (req as any).ntlm = userData;
    (req as any).connection.ntlm = userData;

    if (!userData.authenticated) {
        logger.verbose(`NTLM> Error 403: Unknown user: ${domain}\\${user} (${workstation})`);
        return write(req, res, 403).then(() => false);
    }

    logger.verbose("NTLM> Authentication successful", JSON.stringify(userData));

    next();
    return Promise.resolve(true);
}


function decodeHttpAuthorizationHeader(auth: string): [string, Buffer] | undefined {
    const ah = auth.split(" ");

    if (ah.length === 2 && ah[0] === "NTLM") {
        return ["NTLM", Buffer.from(ah[1], "base64")];
    }
}

function decodeMessageType(msg: Buffer): number {
    if (msg.toString("utf8", 0, 8) != "NTLMSSP\0") {
        throw new Error(`Not a valid NTLM message: ${msg.toString("hex")}`);
    }

    const msg_type = msg.readUInt8(8);
    if (![1, 2, 3].includes(msg_type)) {
        throw new Error(`Incorrect NTLM message Type: ${msg_type}`);
    }

    return msg_type;
}

function parseNtlmAuthenticate(msg: Buffer): [string, string, string] {
    const
        NTLMSSP_NEGOTIATE_UNICODE = 0b00000001,

        DomainNameLen = msg.readUInt16LE(0x1C),
        DomainNameBufferOffset = msg.readUInt32LE(0x20),
        DomainName = msg.slice(DomainNameBufferOffset, DomainNameBufferOffset + DomainNameLen),

        UserNameLen = msg.readUInt16LE(0x24),
        UserNameBufferOffset = msg.readUInt32LE(0x28),
        UserName = msg.slice(UserNameBufferOffset, UserNameBufferOffset + UserNameLen),

        WorkstationLen = msg.readUInt16LE(0x2C),
        WorkstationBufferOffset = msg.readUInt32LE(0x30),
        Workstation = msg.slice(WorkstationBufferOffset, WorkstationBufferOffset + WorkstationLen);

    const encoding = (msg.readUInt8(0x3C) & 0b00000001) ? "utf16le" : undefined;
    return [
        UserName.toString(encoding),
        DomainName.toString(encoding),
        Workstation.toString(encoding)
    ];
}

function fakeNtlmChallenge(): Buffer {
    const challenge = Buffer.alloc(40);
    let offset = 0;

    offset = challenge.write("NTLMSSP\0", offset, 8, "ascii");

    // MessageType
    offset = challenge.writeUInt32LE(0x00000002, offset);

    // TargetNameFields
    //   TargetNameLen
    offset = challenge.writeUInt16LE(0x0000, offset);
    //   TargetNameMaxLen
    offset = challenge.writeUInt16LE(0x0000, offset);
    //   TargetNameBufferOffset
    offset = challenge.writeUInt32LE(0x00002800, offset);

    // NegotiateFlags
    offset = challenge.writeUInt32LE(0x00008201, offset);

    // ServerChallenge (8 bytes)
    offset = challenge.write("\x01\x23\x45\x67\x89\xab\xcd\xef", offset, 8, "ascii")

    // Reserved (8 bytes)
    //offset += challenge.writeUInt32LE(0x00000000, offset);
    //offset += challenge.writeUInt32LE(0x00000000, offset);

    return challenge;
}
