#!/usr/bin/env node
import * as yargs from "yargs";

import { start } from "../";

const argv = yargs

    .option("port", {
        describe: "Use this port when starting proxy",
        alias: "p",
        type: "number",
        default: 8080
    })

    .option("basic", {
        describe: "Enable Basic Authentication",
        alias: "b",
        type: "boolean",
        default: false
    })

    .option("ntlm", {
        describe: "Enable NTLM Authentication",
        alias: "n",
        type: "boolean",
        default: false
    })

    .option("https", {
        describe: "Enable HTTPS server",
        alias: "s",
        type: "boolean",
        default: false
    })

    .option("key", {
        describe: "Key for HTTPS server",
        alias: "k",
        type: "string"
    })

    .option("cert", {
        describe: "Certificate for HTTPS server",
        alias: ["c", "crt"],
        type: "string"
    })

    .option("verbose", {
        describe: "Enable Verbose logging",
        alias: "v",
        type: "boolean",
        default: false
    })

    .option("silent", {
        describe: "Silent any logs",
        alias: "S",
        type: "boolean",
        default: false
    })

    .help()
    .alias("h", "help")

    .argv;

start(argv);
