# fake-corp-proxy [![npm version](https://badge.fury.io/js/fake-corp-proxy.svg)](https://badge.fury.io/js/fake-corp-proxy)

A [Node.js](https://nodejs.org) module and command-line utility to start a fake HTTP(S) Forward-Proxy server with Basic or NTLM fake authentication.

## Installation

To use as a command-line utility:

```bash
npm install -g fake-corp-proxy
```

To use as a node.js module:

```bash
npm install fake-corp-proxy
```

## CLI HTTP usage

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
  -h, --help         Show help                                         [boolean]
```

## CLI HTTPS usage

To make `fake-corp-proxy` to handle HTTPS protocol, you need to generate a CA certificate:

```bash
fake-corp-proxy-ca root my-ca-name
```

Then, you have to trust the generated certificate on your OS ([More infos](#trust-ca-certificate)).

Once your CA certificate is trusted you can tunnel HTTPS requests to your proxy. You can also run the proxy in HTTPS mode.

```bash
fake-corp-proxy --https
```

If you forget where is stored you CA certificate, you can run:

```bash
fake-corp-proxy-ca root-path
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

Forward-Proxy in HTTP only:
```bash
fake-corp-proxy
```

Forward-Proxy with HTTP and HTTPS modes enabled:
```bash
fake-corp-proxy --https
```

Forward-Proxy with HTTP and HTTPS and Basic authentication:
```bash
fake-corp-proxy --https --basic
```

Forward-Proxy with HTTP and HTTPS and NTLM authentication:
```bash
fake-corp-proxy --https --ntlm
```

Forward-Proxy with HTTP and HTTPS and NTLM authentication and verbose logging (details of authentication):
```bash
fake-corp-proxy --https --ntlm --verbose
```

## Trust CA certificate

On Windows:
1. Double-click on the certificate file
2. Click on the `Install Certificate` button
3. On opened window, select `Place all certificates in the following store`
4. Click `Browse` then select `Trusted Root Certification Authorities` and click `OK`

On OSX:
1. Double-click on the certificate file
2. Select `login` or `system` in the select box and click `Add`
3. Open `Keychain` and find the newly imported certificate
4. Double-click on the certificate
5. Select `Always Trust` in the `When using this certificate` select box

## License

View [license information](https://github.com/touchifyapp/fake-corp-proxy/blob/master/LICENSE) for the software contained in this image.

## Contributing

You are invited to contribute new features, fixes, or updates, large or small; we are always thrilled to receive pull requests, and do our best to process them as fast as we can.

Before you start to code, we recommend discussing your plans through a [GitHub issue](https://github.com/touchifyapp/fake-corp-proxy/issues), especially for more ambitious contributions. This gives other contributors a chance to point you in the right direction, give you feedback on your design, and help you find out if someone else is working on the same thing.
