import {
    Request,
    Response
} from "express";

export function handleNtlm(req: Request, res: Response, next: Function): void {
    const authHeaders = req.headers["proxy-authorization"];
    if (!authHeaders) {
        console.log(`Got unauthenticated request: ${req.method} ${req.url}, returning 407!`);

        res.status(407)
            .header("Proxy-Authenticate", "NTLM")
            .send();

        return;
    }

    const authData = decodeHttpAuthorizationHeader(authHeaders);
    if (!authData) {
        console.log("Error 400: Proxy-Authorization header not present", req.headers);
        res.status(400).send();
        return;
    }

    try {
        const message_type = decodeMessageType(authData[1]);

        switch (message_type) {
            case 1:
                console.log(`Received NEGOTIATE: Proxy-Authorization: ${authHeaders}`);
                return handleNegotiate(req, res);

            case 3:
                console.log(`Received AUTHENTICATE: Proxy-Authorization: ${authHeaders}`);
                return handleAuthenticate(req, res, next, authData[1]);
        }

        console.log("Error 400: Unknown authorization message type", req);
        res.status(400).send();
    }
    catch (err) {
        console.log("Error 400:", err);
        res.status(400).send();
    }
}


function handleNegotiate(req: Request, res: Response): void {
    const challenge = fakeNtlmChallenge();

    res.status(407)
        .header("Proxy-Authenticate", "NTLM " + challenge.toString("base64"))
        .send();
}

function handleAuthenticate(req: Request, res: Response, next: Function, ntlmMessage: Buffer): void {
    const [user, domain, workstation] = parseNtlmAuthenticate(ntlmMessage);

    // if we were going to do proper authentication, here"s where it would happen.
    const authenticated = !user.startsWith("unauth");

    const userData = {
        domain,
        user,
        workstation,
        authenticated
    };

    (req as any).ntlm = userData;
    (req as any).connection.ntlm = userData;

    if (!authenticated) {
        res.status(403).send();
        return;
    }

    return next();
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
