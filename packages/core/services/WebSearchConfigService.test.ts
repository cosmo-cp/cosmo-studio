import {beforeEach, describe, expect, it, vi} from "vitest";
import type {WebSearchConfigRepository} from "../repositories/WebSearchConfigRepository";
import {WebSearchConfigService} from "./WebSearchConfigService";
import {WebSearchProviderTypeEnum} from "../database/schema/webSearchConfigSchema";
import type {SecretStore} from "../platform/SecretStore";

const secretStore: SecretStore = {
    isEncryptionAvailable: () => true,
    encrypt: (value) => Buffer.from(value, "utf-8").toString("base64"),
    decrypt: vi.fn(() => "decrypted-key"),
};

describe("WebSearchConfigService", () => {
    let repository: WebSearchConfigRepository;

    beforeEach(() => {
        repository = {
            getByType: vi.fn(),
            create: vi.fn(),
            updateByType: vi.fn(),
            deleteByType: vi.fn(),
        } as unknown as WebSearchConfigRepository;
    });

    it("returns a renderer-safe config view", async () => {
        repository.getByType = vi.fn().mockResolvedValue({
            id: "config-id",
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: null,
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
        });
        const service = new WebSearchConfigService(repository, secretStore);

        const result = await service.getConfig(WebSearchProviderTypeEnum.EXA);

        expect(result).toEqual({
            id: "config-id",
            createdAt: new Date("2026-03-18T00:00:00.000Z"),
            updatedAt: null,
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            hasApiKey: true,
        });
    });

    it("requires an api key when creating a new config", async () => {
        repository.getByType = vi.fn().mockResolvedValue(undefined);
        const service = new WebSearchConfigService(repository, secretStore);

        await expect(service.saveConfig({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
        })).rejects.toThrow("API key is required.");
    });

    it("preserves the existing key when editing without a replacement", async () => {
        repository.getByType = vi.fn().mockResolvedValue({
            id: "config-id",
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: null,
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: Buffer.from("secret").toString("base64"),
        });
        repository.updateByType = vi.fn().mockResolvedValue({
            id: "config-id",
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: "2026-03-18T01:00:00.000Z",
            type: WebSearchProviderTypeEnum.EXA,
            enabled: false,
        });
        const service = new WebSearchConfigService(repository, secretStore);

        const result = await service.saveConfig({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: false,
            apiKey: "",
        });

        expect(repository.updateByType).toHaveBeenCalledWith(WebSearchProviderTypeEnum.EXA, {
            enabled: false,
            apiKey: undefined,
        });
        expect(result.enabled).toBe(false);
        expect(result.hasApiKey).toBe(true);
    });

    it("returns the enabled Exa config for runtime use", async () => {
        repository.getByType = vi.fn().mockResolvedValue({
            id: "config-id",
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: null,
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: Buffer.from("secret").toString("base64"),
        });
        const service = new WebSearchConfigService(repository, secretStore);

        const result = await service.getEnabledExaConfig();

        expect(result?.apiKey).toBe("decrypted-key");
        expect(result?.type).toBe(WebSearchProviderTypeEnum.EXA);
    });

    it("returns null when Exa is disabled", async () => {
        repository.getByType = vi.fn().mockResolvedValue({
            id: "config-id",
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: null,
            type: WebSearchProviderTypeEnum.EXA,
            enabled: false,
            apiKey: Buffer.from("secret").toString("base64"),
        });
        const service = new WebSearchConfigService(repository, secretStore);

        await expect(service.getEnabledExaConfig()).resolves.toBeNull();
    });
});
