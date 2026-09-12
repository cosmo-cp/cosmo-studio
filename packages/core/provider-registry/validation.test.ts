import { describe, expect, it } from 'vitest';
import { DECLARED_PROVIDER_ADAPTER_KEYS, DISCOVERY_ADAPTER_KEYS, PROVIDER_ICON_KEYS } from './public';
import rawRegistry from './registry.json';
import { validateProviderRegistry, type RegistryValidationDependencies } from './validation';

interface MutableProvider {
    id: string;
    aliases?: string[];
    fields: Array<{
        key: string;
        type: string;
        defaultValue?: unknown;
        options?: Array<{ value: string; label: string }>;
        constraints?: { minLength?: number; maxLength?: number; minimum?: number; maximum?: number };
    }>;
    adapter: { key: string };
    npmPackage: { name: string; versionRange: string; dependencyType: string; providerFactoryExport: string };
    display: { iconKey: string };
    discovery: { strategy: string; adapterKey?: string; sourceKey?: string };
    support: { route: string; level: string; limitations?: string[]; replacementProviderId?: string };
    [key: string]: unknown;
}

type MutableRegistry = {
    version: string;
    providers: MutableProvider[];
    extensions: unknown[];
};

const dependencies: RegistryValidationDependencies = {
    adapterKeys: DECLARED_PROVIDER_ADAPTER_KEYS,
    discoveryAdapterKeys: DISCOVERY_ADAPTER_KEYS,
    iconKeys: PROVIDER_ICON_KEYS,
};

// Keeps mutations isolated so every contract failure has one deterministic cause.
function fixture(): MutableRegistry {
    return structuredClone(rawRegistry) as MutableRegistry;
}

describe('provider registry validation', () => {
    it('accepts the shipped registry', () => {
        expect(validateProviderRegistry(fixture(), dependencies).providers).toHaveLength(14);
    });

    it('accepts valid select fields, ranges, and deprecation guidance', () => {
        const value = fixture();
        value.providers[0].fields.push({
            key: 'region',
            type: 'select',
            options: [{ value: 'global', label: 'Global' }],
            constraints: { minLength: 1, maxLength: 10, minimum: 0, maximum: 1 },
        });
        Object.assign(value.providers[0].fields.at(-1) ?? {}, {
            scope: 'connection',
            label: 'Region',
            group: 'advanced',
            required: false,
        });
        value.providers[0].support.level = 'deprecated';
        value.providers[0].support.limitations = ['Use the replacement provider.'];

        expect(validateProviderRegistry(value, dependencies).providers[0].support.level).toBe('deprecated');
    });

    it.each([
        [
            'unsupported schema version',
            (value: MutableRegistry) => {
                return (value.version = '2.0.0');
            },
        ],
        [
            'invalid provider ID',
            (value: MutableRegistry) => {
                return (value.providers[0].id = 'Open AI');
            },
        ],
        [
            'unsupported discovery strategy',
            (value: MutableRegistry) => {
                return (value.providers[0].discovery.strategy = 'download-code');
            },
        ],
        [
            'unknown provider property',
            (value: MutableRegistry) => {
                return (value.providers[0].executable = 'import("x")');
            },
        ],
    ])('rejects %s at the schema boundary', (_name, mutate) => {
        const value = fixture();
        mutate(value);
        expect(() => {
            return validateProviderRegistry(value, dependencies);
        }).toThrow('Invalid provider registry schema');
    });

    it.each([
        [
            'duplicate provider IDs',
            (value: MutableRegistry) => {
                return (value.providers[1].id = value.providers[0].id);
            },
            'Duplicate provider ID or alias',
        ],
        [
            'duplicate aliases',
            (value: MutableRegistry) => {
                value.providers[0].aliases = ['legacy-provider'];
                value.providers[1].aliases = ['legacy-provider'];
            },
            'Duplicate provider ID or alias',
        ],
        [
            'duplicate field keys',
            (value: MutableRegistry) => {
                return value.providers[0].fields.push(structuredClone(value.providers[0].fields[0]));
            },
            'Duplicate field key',
        ],
        [
            'secret defaults',
            (value: MutableRegistry) => {
                return (value.providers[0].fields[0].defaultValue = 'never-public');
            },
            'Secret field cannot have a default',
        ],
        [
            'select fields without options',
            (value: MutableRegistry) => {
                return (value.providers[0].fields[0].type = 'select');
            },
            'Select field requires options',
        ],
        [
            'options on non-select fields',
            (value: MutableRegistry) => {
                return (value.providers[0].fields[1].options = [{ value: 'x', label: 'X' }]);
            },
            'Only select fields can define options',
        ],
        [
            'reversed length ranges',
            (value: MutableRegistry) => {
                return (value.providers[0].fields[1].constraints = { minLength: 4, maxLength: 2 });
            },
            'Invalid length range',
        ],
        [
            'reversed numeric ranges',
            (value: MutableRegistry) => {
                return (value.providers[0].fields[1].constraints = { minimum: 4, maximum: 2 });
            },
            'Invalid numeric range',
        ],
        [
            'missing provider adapters',
            (value: MutableRegistry) => {
                return (value.providers[0].adapter.key = 'missing-adapter');
            },
            'Missing provider adapter',
        ],
        [
            'invalid npm package names',
            (value: MutableRegistry) => {
                return (value.providers[0].npmPackage.name = '@AI-SDK/openai');
            },
            'Invalid provider registry schema',
        ],
        [
            'conflicting shared npm package declarations',
            (value: MutableRegistry) => {
                return (value.providers[13].npmPackage.versionRange = '^99.0.0');
            },
            'Conflicting npm package declaration',
        ],
        [
            'missing icons',
            (value: MutableRegistry) => {
                return (value.providers[0].display.iconKey = 'missing-icon');
            },
            'Missing provider icon',
        ],
        [
            'missing discovery adapters',
            (value: MutableRegistry) => {
                value.providers[7].discovery.adapterKey = 'missing-discovery-adapter';
            },
            'Missing discovery adapter',
        ],
        [
            'adapter discovery without a key',
            (value: MutableRegistry) => {
                return delete value.providers[7].discovery.adapterKey;
            },
            'Discovery strategy requires an adapter',
        ],
        [
            'manual discovery with an adapter',
            (value: MutableRegistry) => {
                return (value.providers[13].discovery.adapterKey = 'ollama-model-list-v1');
            },
            'Discovery strategy does not accept an adapter',
        ],
        [
            'models.dev discovery without a source',
            (value: MutableRegistry) => {
                return delete value.providers[0].discovery.sourceKey;
            },
            'Models.dev discovery requires a source key',
        ],
        [
            'non-models.dev discovery with a source',
            (value: MutableRegistry) => {
                return (value.providers[13].discovery.sourceKey = 'custom');
            },
            'Only models.dev discovery accepts a source key',
        ],
        [
            'compatible levels on direct routes',
            (value: MutableRegistry) => {
                return (value.providers[0].support.level = 'compatible');
            },
            'Compatible support level and route must be used together',
        ],
        [
            'compatible routes without compatible levels',
            (value: MutableRegistry) => {
                return (value.providers[0].support.route = 'compatible');
            },
            'Compatible support level and route must be used together',
        ],
        [
            'deprecated providers without guidance',
            (value: MutableRegistry) => {
                return (value.providers[0].support.level = 'deprecated');
            },
            'Deprecated provider requires a limitation or replacement',
        ],
    ])('rejects %s', (_name, mutate, message) => {
        const value = fixture();
        mutate(value);
        expect(() => {
            return validateProviderRegistry(value, dependencies);
        }).toThrow(message);
    });
});
