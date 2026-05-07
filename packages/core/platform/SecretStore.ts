import {injectable} from "inversify";

export interface SecretStore {
    isEncryptionAvailable(): boolean;
    encrypt(value: string): string;
    decrypt(value: string): string;
}

@injectable()
export class Base64SecretStore implements SecretStore {
    public isEncryptionAvailable(): boolean {
        return false;
    }

    public encrypt(value: string): string {
        return Buffer.from(value, "utf-8").toString("base64");
    }

    public decrypt(value: string): string {
        return Buffer.from(value, "base64").toString("utf-8");
    }
}
