import {inject, injectable} from "inversify";
import {eq, getTableColumns} from "drizzle-orm";
import {CORETYPES} from "../types/types";
import {DatabaseManager} from "../database/DatabaseManager";
import {Base64SecretStore, type SecretStore} from "../platform/SecretStore";
import {
    WebSearchConfig,
    WebSearchConfigCreateInput,
    WebSearchConfigInsert,
} from "../dto";
import {
    webSearchConfig,
    WebSearchProviderTypeEnum,
} from "../database/schema/webSearchConfigSchema";

@injectable()
export class WebSearchConfigRepository {
    private db;

    constructor(
        @inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager,
        @inject(CORETYPES.SecretStore) private readonly secretStore: SecretStore = new Base64SecretStore()
    ) {
        this.db = databaseManager.getInstance();
    }

    // Load one provider config, optionally excluding the stored API key for renderer-safe reads.
    public async getByType(
        type: WebSearchProviderTypeEnum,
        options: {withApiKey: boolean}
    ): Promise<WebSearchConfig | Omit<WebSearchConfig, "apiKey"> | undefined> {
        if (options.withApiKey) {
            const result = await this.db.select()
                .from(webSearchConfig)
                .where(eq(webSearchConfig.type, type))
                .limit(1);
            return result[0];
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {apiKey, ...rest} = getTableColumns(webSearchConfig);
        const result = await this.db.select({...rest})
            .from(webSearchConfig)
            .where(eq(webSearchConfig.type, type))
            .limit(1);
        return result[0];
    }

    // Create a new provider config with the API key encrypted before it reaches the database.
    public async create(input: WebSearchConfigCreateInput): Promise<Omit<WebSearchConfig, "apiKey">> {
        const encryptedInput: WebSearchConfigInsert = {
            ...input,
            apiKey: this.encryptApiKey(input.apiKey),
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {apiKey, ...rest} = getTableColumns(webSearchConfig);
        const [createdConfig] = await this.db.insert(webSearchConfig)
            .values(encryptedInput)
            .returning({...rest});
        return createdConfig;
    }

    // Update an existing provider config while preserving encryption semantics for API keys.
    public async updateByType(
        type: WebSearchProviderTypeEnum,
        updates: Partial<WebSearchConfigCreateInput>
    ): Promise<Omit<WebSearchConfig, "apiKey">> {
        const encryptedUpdates = {
            ...updates,
            updatedAt: new Date(),
        };

        if (updates.apiKey !== undefined) {
            encryptedUpdates.apiKey = this.encryptApiKey(updates.apiKey);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {apiKey, ...rest} = getTableColumns(webSearchConfig);
        const [updatedConfig] = await this.db.update(webSearchConfig)
            .set(encryptedUpdates)
            .where(eq(webSearchConfig.type, type))
            .returning({...rest});
        return updatedConfig;
    }

    // Remove a stored provider config by type.
    public async deleteByType(type: WebSearchProviderTypeEnum): Promise<void> {
        await this.db.delete(webSearchConfig).where(eq(webSearchConfig.type, type));
    }

    private encryptApiKey(apiKey: string): string {
        return this.secretStore.encrypt(apiKey);
    }
}
