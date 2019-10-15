import * as CertManager from "node-easy-cert";

export interface RootCAResult {
    keyPath: string;
    certPath: string;
}

export interface CertificateResult {
    keyContent: string;
    certContent: string;
}

const mgr = new CertManager({
    defaultCertAttrs: [
        { shortName: "C", value: "FR" },
        { shortName: "O", value: "Touchify" },
        { shortName: "OU", value: "Dev" },
        { shortName: "ST", value: "Region Sud" }
    ]
});

export function getRooCAPath(): string | null {
    const path = mgr.getRootCAFilePath();
    return path || null;
}

export function isRootCAFileExists(): boolean {
    return mgr.isRootCAFileExists();
}

export function ifRootCATrusted(): boolean {
    return mgr.ifRootCATrusted();
}

export function generateRootCA(config: CertManager.GenerateConfig): Promise<RootCAResult> {
    return new Promise<RootCAResult>((resolve, reject) => {
        mgr.generateRootCA(config, (err, keyPath, certPath) => {
            err ?
                reject(err) :
                resolve({ keyPath, certPath });
        });
    });
}

export function getCertificate(hostname: string): Promise<CertificateResult> {
    return new Promise<CertificateResult>((resolve, reject) => {
        mgr.getCertificate(hostname, (err, keyContent, certContent) => {
            err ?
                reject(err) :
                resolve({ keyContent, certContent });
        });
    });
}

export function clearCerts(): Promise<void> {
    return new Promise<void>((resolve) => {
        mgr.clearCerts(resolve);
    });
}
