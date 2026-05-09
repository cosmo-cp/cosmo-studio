import {safeStorage} from "electron";
import {injectable} from "inversify";
import {Base64SecretStore, type SecretStore} from "core/platform/SecretStore";

@injectable()
export class ElectronSecretStore implements SecretStore {
    private readonly fallback = new Base64SecretStore();

    public isEncryptionAvailable(): boolean {
        return safeStorage.isEncryptionAvailable();
    }

    public encrypt(value: string): string {
        if (this.isEncryptionAvailable()) {
            return safeStorage.encryptString(value).toString("base64");
        }
        return this.fallback.encrypt(value);
    }

    public decrypt(value: string): string {
        if (this.isEncryptionAvailable()) {
            return safeStorage.decryptString(Buffer.from(value, "base64"));
        }
        return this.fallback.decrypt(value);
    }
}
