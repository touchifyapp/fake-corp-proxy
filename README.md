# fake-corp-proxy [![npm version](https://badge.fury.io/js/fake-corp-proxy.svg)](https://badge.fury.io/js/fake-corp-proxy)

A [Node.js](https://nodejs.org) module and command-line utility to start a fake HTTP(S) Forwrard-Proxy server with Basic or NTLM fake authentication.

## Installation

To use as a command-line utility:

```bash
npm install -g fake-corp-proxy
```

To use as a node.js module:

```bash
npm install fake-corp-proxy
```

## CLI usage

Simple usage:

```bash
fake-corp-proxy --port 8080 --ntlm
```

Available options:

```
Options:
  --version          Show version number                               [boolean]
  --port, -p         Use this port when starting proxy  [number] [default: 8080]
  --basic, -b        Enable Basic Authentication      [boolean] [default: false]
  --ntlm, -n         Enable NTLM Authentication       [boolean] [default: false]
  --https, -s        Enable HTTPS server              [boolean] [default: false]
  --key, -k          Key for HTTPS server                               [string]
  --cert, -c, --crt  Certificate for HTTPS server                       [string]
  -h, --help         Show help                                         [boolean]
```

## Module usage

Simple usage:

```js
const fakeProxy = require("fake-corp-proxy");

// Start server
const server = fakeProxy.start({
    port: 8080,
    ntlm: true
});

// When finished
server.close();
```

*Note: The same options as CLI are available"

## Proxy Auto-Configuration (PAC Script)

This Proxy supports PAC Script generation:

```bash
curl http://localhost:8080/pac
```

## Simulate Authentication errors

This module does not really authenticate users.
To simulate an unauthorized user, just use a username starting with `unknwown`.
(eg: `unkwnown`, `unkwnown-user`, `unkwnown-test`)

```bash
curl --proxy-insecure -x \"https://unknown:password@localhost:8081\" https://www.google.com/
```

## Exemples

Forward-Proxy for HTTP only:
```bash
fake-corp-proxy
```

Forward-Proxy for HTTP and HTTPS:
```bash
fake-corp-proxy --https --key certs/server.key --cert certs/server.crt
```

Forward-Proxy for HTTP and HTTPS with Basic authentication:
```bash
fake-corp-proxy --https --key certs/server.key --cert certs/server.crt --basic
```

Forward-Proxy for HTTP and HTTPS with NTLM authentication:
```bash
fake-corp-proxy --https --key certs/server.key --cert certs/server.crt --ntlm
```

Forward-Proxy for HTTP and HTTPS with NTLM authentication and verbose logging (details of authentication):
```bash
fake-corp-proxy --https --key certs/server.key --cert certs/server.crt --ntlm --verbose
```

## Generate your SSL certificates

To generate self-signed certificates for your proxy, run:

```bash
openssl req -nodes -new -x509 -keyout server.key -out server.crt
```

Then you have to trust the server.crt in your OS to allow proxy validation.

## License

View [license information](https://github.com/touchifyapp/fake-corp-proxy/blob/master/LICENSE) for the software contained in this image.

## Contributing

You are invited to contribute new features, fixes, or updates, large or small; we are always thrilled to receive pull requests, and do our best to process them as fast as we can.

Before you start to code, we recommend discussing your plans through a [GitHub issue](https://github.com/touchifyapp/fake-corp-proxy/issues), especially for more ambitious contributions. This gives other contributors a chance to point you in the right direction, give you feedback on your design, and help you find out if someone else is working on the same thing.
