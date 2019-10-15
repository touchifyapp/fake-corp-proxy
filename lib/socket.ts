import {
    Socket,
    SocketConnectOpts,

    connect as connectSocket
} from "net";

import {
    Readable,
    Duplex
} from "stream";

export {
    Socket,
    SocketConnectOpts
};

export async function writeResponse(socket: Socket, httpVersion: string, statusCode: number, headers?: Record<string, string>): Promise<void> {
    await writeChunck(socket, `HTTP/${httpVersion} ${statusCode} ${getStatusMessage(statusCode)}\r\n${headers ? "" : "\r\n"}`);

    if (headers) {
        const headersString = Object.keys(headers)
            .reduce((res, key) => res + `${key}: ${headers[key]}\r\n`, "");

        await writeChunck(socket, headersString + "\r\n");
    }

    await end(socket);
}

export function writeChunck(socket: Socket, data: string, encoding = "utf-8"): Promise<void> {
    return new Promise((resolve, reject) => {
        socket.write(data, encoding, err => {
            err ? reject(err) : resolve();
        });
    });
}

export function end(socket: Socket): Promise<void> {
    return new Promise((resolve) => {
        socket.end(resolve);
    });
}

export function connect(options: SocketConnectOpts): Promise<Socket> {
    return new Promise((resolve) => {
        const connection = connectSocket(options, () => {
            resolve(connection);
        });
    });
}

export function startRead(socket: Socket, stream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
        let resolved = false;

        socket.on("data", chunk => {
            stream.push(chunk);
            if (!resolved) {
                resolved = true;
                resolve();
            }
        });

        socket.on("error", err => {
            reject(err);
        });

        socket.on("end", () => {
            stream.push(null);
        });
    });
}

export function read(socket: Socket, stream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
        socket.on("data", chunk => {
            stream.push(chunk);
        });

        socket.on("error", err => {
            reject(err);
        });

        socket.on("end", () => {
            stream.push(null);
            resolve();
        });
    });
}

export function pipe(srcSocket: Socket, destSocket: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
        srcSocket.pipe(destSocket);
        destSocket.pipe(srcSocket);

        destSocket.on("end", resolve);
        destSocket.on("error", reject);
    })
}

export function tunnel(srcSocket: Readable, tunnelSocket: Duplex, destSocket: NodeJS.WritableStream): Promise<void> {
    return new Promise((resolve, reject) => {
        srcSocket.pipe(tunnelSocket);
        tunnelSocket.pipe(destSocket);

        destSocket.on("end", resolve);
        destSocket.on("error", reject);
    })
}

function getStatusMessage(statusCode: number): string {
    switch (statusCode) {
        // 1xx - Information
        case 100: return "Continue"; // Attente de la suite de la requête.
        case 101: return "Switching Protocols"; // Acceptation du changement de protocole.
        case 102: return "Processing"; // WebDAV RFC 2518 [archive]3: Traitement en cours (évite que le client dépasse le temps d’attente limite).
        case 103: return "Early Hints"; // RFC 82974 : (Expérimental) Dans l'attente de la réponse définitive, le serveur retourne des liens que le client peut commencer à télécharger.
        // 2xx - Succès
        case 200: return "OK"; // Requête traitée avec succès. La réponse dépendra de la méthode de requête utilisée.
        case 201: return "Created"; // Requête traitée avec succès et création d’un document.
        case 202: return "Accepted"; // Requête traitée, mais sans garantie de résultat.
        case 203: return "Non-Authoritative Information"; // Information retournée, mais générée par une source non certifiée.
        case 204: return "No Content"; // Requête traitée avec succès mais pas d’information à renvoyer.
        case 205: return "Reset Content"; // Requête traitée avec succès, la page courante peut être effacée.
        case 206: return "Partial Content"; // Une partie seulement de la ressource a été transmise.
        case 207: return "Multi-Status"; // WebDAV : Réponse multiple.
        case 208: return "Already Reported"; // WebDAV : Le document a été envoyé précédemment dans cette collection.
        case 210: return "Content Different"; // WebDAV : La copie de la ressource côté client diffère de celle du serveur (contenu ou propriétés).
        case 226: return "IM Used"; // RFC 32295 : Le serveur a accompli la requête pour la ressource, et la réponse est une représentation du résultat d'une ou plusieurs manipulations d'instances appliquées à l'instance actuelle.
        // 3xx - Redirection
        case 300: return "Multiple Choices"; // L’URI demandée se rapporte à plusieurs ressources.
        case 301: return "Moved Permanently"; // Document déplacé de façon permanente.
        case 302: return "Found"; // Document déplacé de façon temporaire.
        case 303: return "See Other"; // La réponse à cette requête est ailleurs.
        case 304: return "Not Modified"; // Document non modifié depuis la dernière requête.
        case 305: return "Use Proxy (depuis HTTP/1.1)"; // La requête doit être ré-adressée au proxy.
        case 306: return "Switch Proxy"; // Code utilisé par une ancienne version de la RFC 26166, à présent réservé. Elle signifiait "Les requêtes suivantes doivent utiliser le proxy spécifié"7.
        case 307: return "Temporary Redirect"; // La requête doit être redirigée temporairement vers l’URI spécifiée.
        case 308: return "Permanent Redirect"; // La requête doit être redirigée définitivement vers l’URI spécifiée.
        case 310: return "Too many Redirects"; // La requête doit être redirigée de trop nombreuses fois, ou est victime d’une boucle de redirection.
        // 4xx - Erreur du client web
        case 400: return "Bad Request"; // La syntaxe de la requête est erronée.
        case 401: return "Unauthorized"; // Une authentification est nécessaire pour accéder à la ressource.
        case 402: return "Payment Required"; // Paiement requis pour accéder à la ressource.
        case 403: return "Forbidden"; // Le serveur a compris la requête, mais refuse de l'exécuter. Contrairement à l'erreur 401, s'authentifier ne fera aucune différence. Sur les serveurs où l'authentification est requise, cela signifie généralement que l'authentification a été acceptée mais que les droits d'accès ne permettent pas au client d'accéder à la ressource.
        case 404: return "Not Found"; // Ressource non trouvée.
        case 405: return "Method Not Allowed"; // Méthode de requête non autorisée.
        case 406: return "Not Acceptable"; // La ressource demandée n'est pas disponible dans un format qui respecterait les en-têtes "Accept" de la requête.
        case 407: return "Proxy Authentication Required"; // Accès à la ressource autorisé par identification avec le proxy.
        case 408: return "Request Time-out"; // Temps d’attente d’une requête du client, écoulé côté serveur. D'après les spécifications HTTP: "Le client n'a pas produit de requête dans le délai que le serveur était prêt à attendre. Le client PEUT répéter la demande sans modifications à tout moment ultérieur."8
        case 409: return "Conflict"; // La requête ne peut être traitée en l’état actuel.
        case 410: return "Gone"; // La ressource n'est plus disponible et aucune adresse de redirection n’est connue.
        case 411: return "Length Required"; // La longueur de la requête n’a pas été précisée.
        case 412: return "Precondition Failed"; // Préconditions envoyées par la requête non vérifiées.
        case 413: return "Request Entity Too Large"; // Traitement abandonné dû à une requête trop importante.
        case 414: return "Request-URI Too Long"; // URI trop longue.
        case 415: return "Unsupported Media Type"; // Format de requête non supporté pour une méthode et une ressource données.
        case 416: return "Requested range unsatisfiable"; // Champs d’en-tête de requête « range » incorrect.
        case 417: return "Expectation failed"; // Comportement attendu et défini dans l’en-tête de la requête insatisfaisante.
        case 418: return "I’m a teapot"; // « Je suis une théière ». Ce code est défini dans la RFC 23249 datée du premier avril 1998, Hyper Text Coffee Pot Control Protocol.
        case 421: return "Bad mapping / Misdirected Request"; // La requête a été envoyée à un serveur qui n'est pas capable de produire une réponse (par exemple, car une connexion a été réutilisée).
        case 422: return "Unprocessable entity"; // WebDAV : L’entité fournie avec la requête est incompréhensible ou incomplète.
        case 423: return "Locked"; // WebDAV : L’opération ne peut avoir lieu car la ressource est verrouillée.
        case 424: return "Method failure"; // WebDAV : Une méthode de la transaction a échoué.
        case 425: return "Unordered Collection"; // WebDAV RFC 364810. Ce code est défini dans le brouillon WebDAV Advanced Collections Protocol, mais est absent de Web Distributed Authoring and Versioning (WebDAV) Ordered Collections Protocol.
        case 426: return "Upgrade Required"; // RFC 281711 Le client devrait changer de protocole, par exemple au profit de TLS/1.0.
        case 428: return "Precondition Required"; // RFC 658512 La requête doit être conditionnelle.
        case 429: return "Too Many Requests"; // RFC 658513 Le client a émis trop de requêtes dans un délai donné.
        case 431: return "Request Header Fields Too Large"; // RFC 658513 Les entêtes HTTP émises dépassent la taille maximale admise par le serveur.
        case 449: return "Retry With"; // Code défini par Microsoft. La requête devrait être renvoyée après avoir effectué une action.
        case 450: return "Blocked by Windows Parental Controls"; // Code défini par Microsoft. Cette erreur est produite lorsque les outils de contrôle parental de Windows sont activés et bloquent l’accès à la page.
        case 451: return "Unavailable For Legal Reasons"; // Ce code d'erreur indique que la ressource demandée est inaccessible pour des raisons d'ordre légal14,15.
        case 456: return "Unrecoverable Error"; // WebDAV : Erreur irrécupérable.
        // Codes 4xx étendus au serveur Nginx
        case 444: return "No Response"; // Indique que le serveur n'a retourné aucune information vers le client et a fermé la connexion.
        case 495: return "SSL Certificate Error"; // Une extension de l'erreur 400 Bad Request, utilisée lorsque le client a fourni un certificat invalide.
        case 496: return "SSL Certificate Required"; // Une extension de l'erreur 400 Bad Request, utilisée lorsqu'un certificat client requis n'est pas fourni.
        case 497: return "HTTP Request Sent to HTTPS Port"; // Une extension de l'erreur 400 Bad Request, utilisée lorsque le client envoie une requête HTTP vers le port 443 normalement destiné aux requêtes HTTPS.
        case 498: return "Token expired/invalid"; // Le jeton a expiré ou est invalide.
        case 499: return "Client Closed Request"; // Le client a fermé la connexion avant de recevoir la réponse. Cette erreur se produit quand le traitement est trop long côté serveur16.
        // 5xx - Erreur du serveur / du serveur d'application
        case 500: return "Internal Server Error"; // Erreur interne du serveur.
        case 501: return "Not Implemented"; // Fonctionnalité réclamée non supportée par le serveur.
        case 502: return "Bad Gateway ou Proxy Error"; // En agissant en tant que serveur proxy ou passerelle, le serveur a reçu une réponse invalide depuis le serveur distant.
        case 503: return "Service Unavailable"; // Service temporairement indisponible ou en maintenance.
        case 504: return "Gateway Time-out"; // Temps d’attente d’une réponse d’un serveur à un serveur intermédiaire écoulé.
        case 505: return "HTTP Version not supported"; // Version HTTP non gérée par le serveur.
        case 506: return "Variant Also Negotiates"; // RFC 229517 : Erreur de négociation. Transparent content negociation.
        case 507: return "Insufficient storage"; // WebDAV : Espace insuffisant pour modifier les propriétés ou construire la collection.
        case 508: return "Loop detected"; // WebDAV : Boucle dans une mise en relation de ressources (RFC 584218).
        case 509: return "Bandwidth Limit Exceeded"; // Utilisé par de nombreux serveurs pour indiquer un dépassement de quota.
        case 510: return "Not extended"; // RFC 277419 : la requête ne respecte pas la politique d'accès aux ressources HTTP étendues.
        case 511: return "Network authentication required"; // RFC 658513 : Le client doit s'authentifier pour accéder au réseau. Utilisé par les portails captifs pour rediriger les clients vers la page d'authentification.
        // Codes 5xx étendus au mandataire Cloudflare
        case 520: return "Unknown Error"; // L'erreur 520 est utilisé en tant que réponse générique lorsque le serveur d'origine retourne un résultat imprévu.
        case 521: return "Web Server Is Down"; // Le serveur a refusé la connexion depuis Cloudflare.
        case 522: return "Connection Timed Out"; // Cloudflare n'a pas pu négocier un TCP handshake avec le serveur d'origine.
        case 523: return "Origin Is Unreachable"; // Cloudflare n'a pas réussi à joindre le serveur d'origine. Cela peut se produire en cas d'échec de résolution de nom de serveur DNS.
        case 524: return "A Timeout Occurred"; // Cloudflare a établi une connexion TCP avec le serveur d'origine mais n'a pas reçu de réponse HTTP avant l'expiration du délai de connexion.
        case 525: return "SSL Handshake Failed"; // Cloudflare n'a pas pu négocier un SSL/TLS handshake avec le serveur d'origine.
        case 526: return "Invalid SSL Certificate"; // Cloudflare n'a pas pu valider le certificat SSL présenté par le serveur d'origine.
        case 527: return "Railgun Error";
    }

    return "Unknown Status";
}
