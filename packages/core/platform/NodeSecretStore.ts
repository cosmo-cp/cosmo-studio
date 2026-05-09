import crypto from "crypto";
import fs from "fs";
import path from "path";
import {injectable} from "inversify";
import {Base64SecretStore, type SecretStore} from "./SecretStore";

const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const PAYLOAD_VERSION = "v1";

@injectable()
export class NodeSecretStore implements SecretStore {
    private readonly fallback = new Base64SecretStore();
    private key: Buffer | null = null;

    public isEncryptionAvailable(): boolean {
        return true;
    }

    public encrypt(value: string): string {
        const iv = crypto.randomBytes(IV_LENGTH_BYTES);
        const cipher = crypto.createCipheriv("aes-256-gcm", this.getKey(), iv);
        const encrypted = Buffer.concat([
            cipher.update(value, "utf-8"),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();

        return [
            PAYLOAD_VERSION,
            iv.toString("base64"),
            authTag.toString("base64"),
            encrypted.toString("base64"),
        ].join(":");
    }

    public decrypt(value: string): string {
        if (!value.startsWith(`${PAYLOAD_VERSION}:`)) {
            return this.fallback.decrypt(value);
        }

        const [, encodedIv, encodedAuthTag, encodedEncrypted] = value.split(":");
        if (!encodedIv || !encodedAuthTag || !encodedEncrypted) {
            throw new Error("Invalid encrypted secret payload.");
        }

        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            this.getKey(),
            Buffer.from(encodedIv, "base64")
        );
        decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64"));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encodedEncrypted, "base64")),
            decipher.final(),
        ]);
        return decrypted.toString("utf-8");
    }

    private getKey(): Buffer {
        if (this.key) {
            return this.key;
        }

        const envKey = process.env.COSMO_SECRET_KEY;
        if (envKey) {
            const decoded = Buffer.from(envKey, "base64");
            if (decoded.length !== KEY_LENGTH_BYTES) {
                throw new Error("COSMO_SECRET_KEY must be a base64-encoded 32-byte key.");
            }
            this.key = decoded;
            return this.key;
        }

        const dataDir = process.env.COSMO_HTTP_DATA_DIR ?? path.join(process.cwd(), ".cosmo-http");
        const keyPath = path.join(dataDir, "secret.key");
        fs.mkdirSync(dataDir, {recursive: true});

        if (fs.existsSync(keyPath)) {
            const decoded = Buffer.from(fs.readFileSync(keyPath, "utf-8"), "base64");
            if (decoded.length !== KEY_LENGTH_BYTES) {
                throw new Error(`Invalid secret key at ${keyPath}.`);
            }
            this.key = decoded;
            return this.key;
        }

        this.key = crypto.randomBytes(KEY_LENGTH_BYTES);
        fs.writeFileSync(keyPath, this.key.toString("base64"), {
            encoding: "utf-8",
            mode: 0o600,
        });
        return this.key;
    }
}
