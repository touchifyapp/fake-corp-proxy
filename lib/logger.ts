export interface LoggerOptions {
    verbose?: boolean;
    silent?: boolean;
}

export class Logger {
    private _verbose: boolean;
    private _silent: boolean;

    constructor({ verbose, silent }: LoggerOptions) {
        this._verbose = verbose || false;
        this._silent = silent || false;
    }

    public log(...args: any[]): void {
        if (this._silent) return;
        console.log(...args);
    }

    public verbose(...args: any[]): void {
        if (!this._verbose) return;
        this.log(...args);
    }
}
