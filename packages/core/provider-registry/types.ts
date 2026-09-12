import type { ProviderV4 } from '@ai-sdk/provider';

export const PROVIDER_REGISTRY_SCHEMA_VERSION = '1.0.0' as const;

export type RegistrySchemaVersion = typeof PROVIDER_REGISTRY_SCHEMA_VERSION;
export type ProviderRoute = 'direct' | 'compatible' | 'local' | 'gateway';
export type ProviderSupportLevel = 'stable' | 'experimental' | 'compatible' | 'deprecated' | 'hidden';
export type PresentationGroup = 'simple' | 'advanced';
export type ConfigurationScope = 'connection' | 'model' | 'chat';
export type ProviderFieldType = 'string' | 'secret' | 'url' | 'number' | 'boolean' | 'select' | 'string-list';
export type DiscoveryStrategy = 'models-dev' | 'provider-api' | 'openai-compatible' | 'local-api' | 'static' | 'manual';
export type ModelFamily = 'language' | 'embedding' | 'image' | 'speech' | 'transcription' | 'rerank';
export type FieldValue = string | number | boolean | string[];

export interface ProviderFieldDefinition {
    key: string;
    scope: ConfigurationScope;
    type: ProviderFieldType;
    label: string;
    helpText?: string;
    placeholder?: string;
    group: PresentationGroup;
    required: boolean;
    defaultValue?: FieldValue;
    options?: Array<{ value: string; label: string }>;
    constraints?: {
        minLength?: number;
        maxLength?: number;
        minimum?: number;
        maximum?: number;
        allowedSchemes?: Array<'https' | 'http'>;
    };
    mapsTo?: string;
}

export interface ProviderDefinitionV1 {
    id: string;
    version: string;
    aliases?: string[];
    display: {
        name: string;
        description: string;
        iconKey: string;
        documentationUrl: string;
        categories: Array<'hosted' | 'local' | 'router' | 'compatible' | 'enterprise'>;
    };
    support: {
        route: ProviderRoute;
        level: ProviderSupportLevel;
        limitations?: string[];
        deprecatedAt?: string;
        replacementProviderId?: string;
        removalEligibleAfter?: string;
    };
    adapter: {
        key: string;
        apiVersion: 1;
        compatibilityRange: string;
    };
    npmPackage: {
        name: string;
        versionRange: string;
        dependencyType: 'dependencies' | 'devDependencies';
        providerFactoryExport: string;
    };
    fields: ProviderFieldDefinition[];
    validation: {
        ruleSetKey: string;
        normalizationKey: string;
    };
    discovery: {
        strategy: DiscoveryStrategy;
        adapterKey?: string;
        sourceKey?: string;
        allowManualModels: boolean;
    };
    capabilities: {
        modelFamilies: ModelFamily[];
    };
    migrations: Array<{
        fromVersion: string;
        toVersion: string;
        migrationKey: string;
    }>;
}

export interface ProviderRegistryDocumentV1 {
    version: RegistrySchemaVersion;
    providers: ProviderDefinitionV1[];
    extensions: [];
}

export type PublicProviderDefinitionV1 = Omit<
    ProviderDefinitionV1,
    'adapter' | 'npmPackage' | 'validation' | 'migrations'
> & {
    discovery: Pick<ProviderDefinitionV1['discovery'], 'strategy' | 'allowManualModels'>;
};

export interface PublicProviderRegistryV1 {
    version: RegistrySchemaVersion;
    providers: PublicProviderDefinitionV1[];
}

export type UnknownFieldMap = Record<string, unknown>;
export type ValidFieldMap = Record<string, FieldValue | undefined>;
export type NormalizedConnectionConfig = Record<string, FieldValue | undefined>;

export interface EndpointPolicyContext {
    route: ProviderRoute;
}

export type ValidationResult = { valid: true; value: ValidFieldMap } | { valid: false; code: string; message: string };

export interface ResolvedSecretConnectionConfig {
    providerId: string;
    displayName: string;
    apiKey?: string;
    baseURL?: string;
}

export type ConnectionTestResult = { ok: true } | { ok: false; code: string; message: string };

export interface ProviderAdapterV1 {
    readonly key: string;
    readonly apiVersion: 1;
    validateConnection(input: UnknownFieldMap, context: EndpointPolicyContext): ValidationResult;
    normalizeConnection(input: ValidFieldMap): NormalizedConnectionConfig;
    createProvider(input: ResolvedSecretConnectionConfig): ProviderV4;
    testConnection(input: ResolvedSecretConnectionConfig, signal: AbortSignal): Promise<ConnectionTestResult>;
}
