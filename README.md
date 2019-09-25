# fake-corp-proxy

A [Node.js](https://nodejs.org) module and command-line utility to start a fake proxy server with Basic and NTLM fake authentication.

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

## Module Options

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

## License

View [license information](https://github.com/touchifyapp/fake-corp-proxy/blob/master/LICENSE) for the software contained in this image.

## Contributing

You are invited to contribute new features, fixes, or updates, large or small; we are always thrilled to receive pull requests, and do our best to process them as fast as we can.

Before you start to code, we recommend discussing your plans through a [GitHub issue](https://github.com/touchifyapp/fake-corp-proxy/issues), especially for more ambitious contributions. This gives other contributors a chance to point you in the right direction, give you feedback on your design, and help you find out if someone else is working on the same thing.
