import { IncomingMessage } from "http";
import { Response } from "express";

import {
    Socket,
    writeResponse as writeToSocket
} from "./socket";

export { IncomingMessage, Socket };
export type ResponseOrSocket = Response | Socket;

export function write(req: IncomingMessage, res: ResponseOrSocket, statusCode: number, headers?: Record<string, string>): Promise<void> {
    return (res instanceof Socket) ?
        writeToSocket(res, req.httpVersion, statusCode, headers) :
        writeToResponse(res, statusCode, headers);
}

function writeToResponse(res: Response, statusCode: number, headers?: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            res.status(statusCode);

            if (headers) {
                Object.keys(headers).forEach(key => res.header(key, headers[key]));
            }

            res.send();
            resolve();
        }
        catch (err) {
            reject(err);
        }
    });
}
