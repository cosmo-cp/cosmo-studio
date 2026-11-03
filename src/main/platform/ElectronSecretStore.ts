import { Base64SecretStore, type SecretStore } from 'core/platform/SecretStore';
import { safeStorage } from 'electron';
import { injectable } from 'inversify';

@injectable()
export class ElectronSecretStore implements SecretStore {
    private readonly fallback = new Base64SecretStore();

    public async isEncryptionAvailable(): Promise<boolean> {
        return safeStorage.isAsyncEncryptionAvailable();
    }

    public async encrypt(value: string): Promise<string> {
        if (await this.isEncryptionAvailable()) {
            return (await safeStorage.encryptStringAsync(value)).toString('base64');
        }
        return this.fallback.encrypt(value);
    }

    public async decrypt(value: string): Promise<string> {
        if (await this.isEncryptionAvailable()) {
            const encrypted = Buffer.from(value, 'base64');
            let decrypted = await safeStorage.decryptStringAsync(encrypted);
            if (decrypted.shouldReEncrypt) {
                decrypted = await safeStorage.decryptStringAsync(encrypted);
            }
            return decrypted.result;
        }
        return this.fallback.decrypt(value);
    }
}
