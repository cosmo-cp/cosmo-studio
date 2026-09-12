import { z } from 'zod';
import { PROVIDER_REGISTRY_SCHEMA_VERSION, type ProviderRegistryDocumentV1 } from './types';

const identifierPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const fieldKeyPattern = /^[A-Za-z][A-Za-z0-9]*$/;
const semanticVersionPattern = /^\d+\.\d+\.\d+$/;
const compatibilityRangePattern = /^\^\d+\.\d+\.\d+$/;
const npmPackageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const npmVersionRangePattern = /^(?:\^|~)?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const fieldValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
const fieldSchema = z
    .object({
        key: z.string().min(1).regex(fieldKeyPattern),
        scope: z.enum(['connection', 'model', 'chat']),
        type: z.enum(['string', 'secret', 'url', 'number', 'boolean', 'select', 'string-list']),
        label: z.string().min(1),
        helpText: z.string().min(1).optional(),
        placeholder: z.string().min(1).optional(),
        group: z.enum(['simple', 'advanced']),
        required: z.boolean(),
        defaultValue: fieldValueSchema.optional(),
        options: z
            .array(z.object({ value: z.string().min(1), label: z.string().min(1) }).strict())
            .min(1)
            .optional(),
        constraints: z
            .object({
                minLength: z.number().int().nonnegative().optional(),
                maxLength: z.number().int().nonnegative().optional(),
                minimum: z.number().optional(),
                maximum: z.number().optional(),
                allowedSchemes: z
                    .array(z.enum(['https', 'http']))
                    .min(1)
                    .optional(),
            })
            .strict()
            .optional(),
        mapsTo: z.string().min(1).regex(fieldKeyPattern).optional(),
    })
    .strict();

const providerSchema = z
    .object({
        id: z.string().regex(identifierPattern),
        version: z.string().regex(semanticVersionPattern),
        aliases: z.array(z.string().regex(identifierPattern)).optional(),
        display: z
            .object({
                name: z.string().min(1),
                description: z.string().min(1),
                iconKey: z.string().regex(identifierPattern),
                documentationUrl: z.url().startsWith('https://'),
                categories: z.array(z.enum(['hosted', 'local', 'router', 'compatible', 'enterprise'])).min(1),
            })
            .strict(),
        support: z
            .object({
                route: z.enum(['direct', 'compatible', 'local', 'gateway']),
                level: z.enum(['stable', 'experimental', 'compatible', 'deprecated', 'hidden']),
                limitations: z.array(z.string().min(1)).optional(),
                deprecatedAt: z.iso.datetime().optional(),
                replacementProviderId: z.string().regex(identifierPattern).optional(),
                removalEligibleAfter: z.iso.datetime().optional(),
            })
            .strict(),
        adapter: z
            .object({
                key: z.string().regex(identifierPattern),
                apiVersion: z.literal(1),
                compatibilityRange: z.string().regex(compatibilityRangePattern),
            })
            .strict(),
        npmPackage: z
            .object({
                name: z.string().regex(npmPackageNamePattern),
                versionRange: z.string().regex(npmVersionRangePattern),
                dependencyType: z.enum(['dependencies', 'devDependencies']),
                providerFactoryExport: z.string().min(1).regex(fieldKeyPattern),
            })
            .strict(),
        fields: z.array(fieldSchema),
        validation: z
            .object({
                ruleSetKey: z.string().regex(identifierPattern),
                normalizationKey: z.string().regex(identifierPattern),
            })
            .strict(),
        discovery: z
            .object({
                strategy: z.enum(['models-dev', 'provider-api', 'openai-compatible', 'local-api', 'static', 'manual']),
                adapterKey: z.string().regex(identifierPattern).optional(),
                sourceKey: z.string().regex(identifierPattern).optional(),
                allowManualModels: z.boolean(),
            })
            .strict(),
        capabilities: z
            .object({
                modelFamilies: z
                    .array(z.enum(['language', 'embedding', 'image', 'speech', 'transcription', 'rerank']))
                    .min(1),
            })
            .strict(),
        migrations: z.array(
            z
                .object({
                    fromVersion: z.string().regex(semanticVersionPattern),
                    toVersion: z.string().regex(semanticVersionPattern),
                    migrationKey: z.string().regex(identifierPattern),
                })
                .strict(),
        ),
    })
    .strict();

const registrySchema = z
    .object({
        version: z.literal(PROVIDER_REGISTRY_SCHEMA_VERSION),
        providers: z.array(providerSchema).min(1),
        extensions: z.tuple([]),
    })
    .strict();

export interface RegistryValidationDependencies {
    adapterKeys: ReadonlySet<string>;
    discoveryAdapterKeys: ReadonlySet<string>;
    iconKeys: ReadonlySet<string>;
}

// Ensures trusted registry data cannot enable an incomplete or unsafe provider definition.
export function validateProviderRegistry(
    input: unknown,
    dependencies: RegistryValidationDependencies,
): ProviderRegistryDocumentV1 {
    const parsed = registrySchema.safeParse(input);
    if (!parsed.success) {
        throw new Error(`Invalid provider registry schema: ${z.prettifyError(parsed.error)}`);
    }

    const ids = new Set<string>();
    const aliases = new Set<string>();
    const npmPackages = new Map<string, { versionRange: string; dependencyType: string }>();
    for (const provider of parsed.data.providers) {
        if (ids.has(provider.id) || aliases.has(provider.id)) {
            throw new Error(`Duplicate provider ID or alias: ${provider.id}`);
        }
        ids.add(provider.id);

        for (const alias of provider.aliases ?? []) {
            if (ids.has(alias) || aliases.has(alias)) {
                throw new Error(`Duplicate provider ID or alias: ${alias}`);
            }
            aliases.add(alias);
        }

        const fieldKeys = new Set<string>();
        for (const field of provider.fields) {
            if (fieldKeys.has(field.key)) {
                throw new Error(`Duplicate field key for ${provider.id}: ${field.key}`);
            }
            fieldKeys.add(field.key);
            validateField(provider.id, field);
        }

        if (!dependencies.adapterKeys.has(provider.adapter.key)) {
            throw new Error(`Missing provider adapter for ${provider.id}: ${provider.adapter.key}`);
        }
        validateNpmPackage(provider.id, provider.npmPackage, npmPackages);
        if (!dependencies.iconKeys.has(provider.display.iconKey)) {
            throw new Error(`Missing provider icon for ${provider.id}: ${provider.display.iconKey}`);
        }
        if (provider.discovery.adapterKey && !dependencies.discoveryAdapterKeys.has(provider.discovery.adapterKey)) {
            throw new Error(`Missing discovery adapter for ${provider.id}: ${provider.discovery.adapterKey}`);
        }
        validateDiscovery(provider.id, provider.discovery);
        validateSupport(provider.id, provider.support);
    }

    return parsed.data;
}

// Keeps registry-driven installs deterministic when multiple providers share one SDK package.
function validateNpmPackage(
    providerId: string,
    npmPackage: z.infer<typeof providerSchema>['npmPackage'],
    npmPackages: Map<string, { versionRange: string; dependencyType: string }>,
): void {
    const existing = npmPackages.get(npmPackage.name);
    if (!existing) {
        npmPackages.set(npmPackage.name, {
            versionRange: npmPackage.versionRange,
            dependencyType: npmPackage.dependencyType,
        });
        return;
    }
    if (existing.versionRange !== npmPackage.versionRange || existing.dependencyType !== npmPackage.dependencyType) {
        throw new Error(`Conflicting npm package declaration for ${providerId}: ${npmPackage.name}`);
    }
}

// Enforces relationships that JSON shape validation cannot express.
function validateField(providerId: string, field: z.infer<typeof fieldSchema>): void {
    if (field.type === 'secret' && field.defaultValue !== undefined) {
        throw new Error(`Secret field cannot have a default for ${providerId}: ${field.key}`);
    }
    if (field.type === 'select' && !field.options) {
        throw new Error(`Select field requires options for ${providerId}: ${field.key}`);
    }
    if (field.type !== 'select' && field.options) {
        throw new Error(`Only select fields can define options for ${providerId}: ${field.key}`);
    }
    if (field.constraints?.minLength !== undefined && field.constraints?.maxLength !== undefined) {
        if (field.constraints.minLength > field.constraints.maxLength) {
            throw new Error(`Invalid length range for ${providerId}: ${field.key}`);
        }
    }
    if (field.constraints?.minimum !== undefined && field.constraints?.maximum !== undefined) {
        if (field.constraints.minimum > field.constraints.maximum) {
            throw new Error(`Invalid numeric range for ${providerId}: ${field.key}`);
        }
    }
}

// Keeps discovery definitions explicit so unsupported combinations never fall back silently.
function validateDiscovery(providerId: string, discovery: z.infer<typeof providerSchema>['discovery']): void {
    const adapterStrategies = new Set(['provider-api', 'openai-compatible', 'local-api']);
    if (adapterStrategies.has(discovery.strategy) && !discovery.adapterKey) {
        throw new Error(`Discovery strategy requires an adapter for ${providerId}: ${discovery.strategy}`);
    }
    if (!adapterStrategies.has(discovery.strategy) && discovery.adapterKey) {
        throw new Error(`Discovery strategy does not accept an adapter for ${providerId}: ${discovery.strategy}`);
    }
    if (discovery.strategy === 'models-dev' && !discovery.sourceKey) {
        throw new Error(`Models.dev discovery requires a source key for ${providerId}`);
    }
    if (discovery.strategy !== 'models-dev' && discovery.sourceKey) {
        throw new Error(`Only models.dev discovery accepts a source key for ${providerId}`);
    }
}

// Prevents contradictory lifecycle labels from reaching the renderer.
function validateSupport(providerId: string, support: z.infer<typeof providerSchema>['support']): void {
    if ((support.level === 'compatible') !== (support.route === 'compatible')) {
        throw new Error(`Compatible support level and route must be used together for ${providerId}`);
    }
    if (support.level === 'deprecated' && !support.limitations?.length && !support.replacementProviderId) {
        throw new Error(`Deprecated provider requires a limitation or replacement: ${providerId}`);
    }
}
