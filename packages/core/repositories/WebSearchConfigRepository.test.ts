import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {eq} from "drizzle-orm";
import type {DatabaseManager} from "../database/DatabaseManager";
import {createTestDb, type TestDb} from "../test-utils/testDb";
import {
    webSearchConfig,
    WebSearchProviderTypeEnum,
} from "../database/schema/webSearchConfigSchema";
import {WebSearchConfigRepository} from "./WebSearchConfigRepository";

const safeStorage = vi.hoisted(() => ({
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((value: string) => Buffer.from(`enc:${value}`)),
}));

vi.mock("electron", () => ({
    safeStorage,
}));

describe("WebSearchConfigRepository", () => {
    let testDb: TestDb;
    let repository: WebSearchConfigRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => testDb.db,
        } as unknown as DatabaseManager;
        repository = new WebSearchConfigRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        safeStorage.isEncryptionAvailable.mockReturnValue(true);
        safeStorage.encryptString.mockClear();
        await testDb.db.delete(webSearchConfig);
    });

    it("creates configs with encrypted api keys and hides the key on safe reads", async () => {
        const created = await repository.create({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: "secret",
        });

        expect(created.type).toBe(WebSearchProviderTypeEnum.EXA);
        expect(safeStorage.encryptString).toHaveBeenCalledWith("secret");

        const storedRows = await testDb.db.select().from(webSearchConfig);
        expect(storedRows[0].apiKey).toBe(Buffer.from("enc:secret").toString("base64"));

        const withoutKey = await repository.getByType(WebSearchProviderTypeEnum.EXA, {withApiKey: false});
        expect(withoutKey).toBeDefined();
        expect(Object.prototype.hasOwnProperty.call(withoutKey, "apiKey")).toBe(false);

        const withKey = await repository.getByType(WebSearchProviderTypeEnum.EXA, {withApiKey: true});
        expect(withKey).toBeDefined();
        expect("apiKey" in (withKey ?? {})).toBe(true);
    });

    it("updates configs and re-encrypts api keys when provided", async () => {
        await repository.create({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: "secret",
        });

        const updated = await repository.updateByType(WebSearchProviderTypeEnum.EXA, {
            enabled: false,
            apiKey: "rotated",
        });

        expect(updated.enabled).toBe(false);
        expect(safeStorage.encryptString).toHaveBeenCalledWith("rotated");

        const [stored] = await testDb.db.select()
            .from(webSearchConfig)
            .where(eq(webSearchConfig.type, WebSearchProviderTypeEnum.EXA))
            .limit(1);
        expect(stored.apiKey).toBe(Buffer.from("enc:rotated").toString("base64"));
    });

    it("falls back to base64 when encryption is unavailable", async () => {
        safeStorage.isEncryptionAvailable.mockReturnValue(false);

        await repository.create({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: "plain",
        });

        expect(safeStorage.encryptString).not.toHaveBeenCalled();

        const [stored] = await testDb.db.select().from(webSearchConfig).limit(1);
        expect(stored.apiKey).toBe(Buffer.from("plain", "utf-8").toString("base64"));
    });

    it("deletes configs by type", async () => {
        await repository.create({
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            apiKey: "secret",
        });

        await repository.deleteByType(WebSearchProviderTypeEnum.EXA);

        const rows = await testDb.db.select().from(webSearchConfig);
        expect(rows).toEqual([]);
    });
});
