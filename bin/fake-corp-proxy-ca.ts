#!/usr/bin/env node
import * as yargs from "yargs";

import * as certs from "../lib/certificates";
import { Logger, LoggerOptions } from "../lib/logger";


yargs
    .command("root",
        "Generate a new Root CA certificate",
        yargs => yargs
            .option("common-name", {
                describe: "Force common name to specified value",
                alias: "cn",
                default: "fake-corp-proxy-ca"
            })
            .option("overwrite", {
                describe: "Overwrite existing file",
                alias: ["o", "f"],
                default: false
            }),
        argv => {
            const logger = new Logger(argv as LoggerOptions);
            certs.generateRootCA({ commonName: argv["common-name"], overwrite: argv.overwrite })
                .catch(err => {
                    logger.log("Root CA certificate generation Error:", err);
                });
        }
    )

    .command("root-path",
        "Get current Root CA certificate path",
        {}, () => {
            const
                logger = new Logger({}),
                path = certs.getRooCAPath();

            if (path) {
                logger.log("Error: No Root CA file generated!\nPlease use `fake-corp-proxy-ca root` to generate a new one.");
            }
            else {
                logger.log(path);
            }
        }
    )

    .command("get <hostname>",
        "Get or create certificate for given hostname",
        yargs => yargs
            .positional("hostname", {
                describe: "Hostname for the new certificate",
                type: "string"
            }),
        argv => {
            const logger = new Logger(argv as LoggerOptions);
            if (!argv.hostname) {
                return logger.log("Error: Missing hostname parameter!");
            }

            certs.getCertificate(argv.hostname)
                .then(({ keyContent, certContent }) => {
                    logger.log(`Certificate for host: ${argv.hostname}\n\nCERTIFICATE:\n${certContent}\n\nKEY:\n${keyContent}`);
                })
                .catch(err => {
                    logger.log("Certificate generation Error:", err);
                });
        }
    )

    .command("clear",
        "Clear all certificates from root directory",
        {}, () => {
            const logger = new Logger({});

            certs.clearCerts()
                .then(() => {
                    logger.log("All certificates cleared!");
                })
                .catch(err => {
                    logger.log("Clear certificates Error:", err);
                });
        }
    )

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

    .demandCommand()
    .argv;
