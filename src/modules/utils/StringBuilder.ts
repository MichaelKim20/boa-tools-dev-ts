export class StringBuilder {
    private strings: string[];
    constructor() {
        this.strings = [];
    }

    public append(value: string) {
        if (value) {
            this.strings.push(value);
        }
    };

    public clear() {
        this.strings.length = 1;
    };

    public toString(): string {
        return this.strings.join(" ");
    };
}

