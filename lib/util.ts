import { Socket } from "net";
import { IncomingMessage } from "http";
import { Response } from "express";

import * as socket from "./socket";

export { IncomingMessage };
export type ResponseOrSocket = Response | Socket;

export function write(req: IncomingMessage, res: ResponseOrSocket, statusCode: number, headers?: Record<string, string>): Promise<void> {
    return (res instanceof Socket) ?
        socket.writeResponse(res, req.httpVersion, statusCode, headers) :
        writeToResponse(req, res, statusCode, headers);
}

function writeToResponse(req: IncomingMessage, res: Response, statusCode: number, headers?: Record<string, string>): Promise<void> {
    return new Promise((resolve) => {
        res.status(statusCode);

        if (headers) {
            Object.keys(headers).forEach(key => res.header(key, headers[key]));
        }

        res.send();
    });
}
