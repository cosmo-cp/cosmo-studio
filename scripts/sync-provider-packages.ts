import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
    DECLARED_PROVIDER_ADAPTER_KEYS,
    DISCOVERY_ADAPTER_KEYS,
    PROVIDER_ICON_KEYS,
} from '../packages/core/provider-registry/public';
import rawRegistry from '../packages/core/provider-registry/registry.json';
import type { ProviderRegistryDocumentV1 } from '../packages/core/provider-registry/types';
import { validateProviderRegistry } from '../packages/core/provider-registry/validation';

type DependencyType = 'dependencies' | 'devDependencies';

interface PackageJsonDocument {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: unknown;
}

export interface ProviderPackageDeclaration {
    name: string;
    versionRange: string;
    dependencyType: DependencyType;
}

export interface ProviderPackageChange extends ProviderPackageDeclaration {
    currentVersion?: string;
    currentDependencyType?: DependencyType;
}

type InstallRunner = (command: string, args: string[], options: { cwd: string; stdio: 'inherit' }) => void;

const rootDirectory = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDirectory, 'package.json');

// Returns one install declaration per npm package referenced by the trusted provider registry.
export function getProviderPackageDeclarations(registry: ProviderRegistryDocumentV1): ProviderPackageDeclaration[] {
    const packages = new Map<string, ProviderPackageDeclaration>();
    for (const provider of registry.providers) {
        if (!packages.has(provider.npmPackage.name)) {
            packages.set(provider.npmPackage.name, {
                name: provider.npmPackage.name,
                versionRange: provider.npmPackage.versionRange,
                dependencyType: provider.npmPackage.dependencyType,
            });
        }
    }
    return [...packages.values()].sort((left, right) => {
        return left.name.localeCompare(right.name);
    });
}

// Computes the package.json edits needed before doing any npm work.
export function findProviderPackageChanges(
    packageJson: PackageJsonDocument,
    declarations: ProviderPackageDeclaration[],
): ProviderPackageChange[] {
    return declarations.flatMap((declaration) => {
        const dependencyVersion = packageJson.dependencies?.[declaration.name];
        const devDependencyVersion = packageJson.devDependencies?.[declaration.name];
        const currentDependencyType =
            dependencyVersion !== undefined
                ? 'dependencies'
                : devDependencyVersion !== undefined
                  ? 'devDependencies'
                  : undefined;
        const currentVersion = dependencyVersion ?? devDependencyVersion;

        if (currentDependencyType === declaration.dependencyType && currentVersion === declaration.versionRange) {
            return [];
        }

        return [{ ...declaration, currentDependencyType: currentDependencyType, currentVersion: currentVersion }];
    });
}

// Writes registry-declared versions back after npm has updated the lockfile.
export function applyProviderPackageVersions(
    packageJson: PackageJsonDocument,
    declarations: ProviderPackageDeclaration[],
): PackageJsonDocument {
    const nextPackageJson: PackageJsonDocument = { ...packageJson };
    nextPackageJson.dependencies = { ...(packageJson.dependencies ?? {}) };
    nextPackageJson.devDependencies = { ...(packageJson.devDependencies ?? {}) };

    for (const declaration of declarations) {
        const oppositeDependencyType =
            declaration.dependencyType === 'dependencies' ? 'devDependencies' : 'dependencies';
        nextPackageJson[declaration.dependencyType] = {
            ...(nextPackageJson[declaration.dependencyType] ?? {}),
            [declaration.name]: declaration.versionRange,
        };
        delete nextPackageJson[oppositeDependencyType]?.[declaration.name];
    }

    nextPackageJson.dependencies = sortDependencies(nextPackageJson.dependencies);
    nextPackageJson.devDependencies = sortDependencies(nextPackageJson.devDependencies);
    return nextPackageJson;
}

// Installs missing or mismatched provider SDK packages and normalizes package.json to registry metadata.
export function syncProviderPackages(
    options: { cwd: string; packageJsonPath: string; checkOnly: boolean },
    runInstall: InstallRunner = execFileSync,
): ProviderPackageChange[] {
    const registry = validateProviderRegistry(rawRegistry, {
        adapterKeys: DECLARED_PROVIDER_ADAPTER_KEYS,
        discoveryAdapterKeys: DISCOVERY_ADAPTER_KEYS,
        iconKeys: PROVIDER_ICON_KEYS,
    });
    const declarations = getProviderPackageDeclarations(registry);
    const packageJson = JSON.parse(fs.readFileSync(options.packageJsonPath, 'utf-8')) as PackageJsonDocument;
    const changes = findProviderPackageChanges(packageJson, declarations);

    if (changes.length === 0) {
        return [];
    }
    if (options.checkOnly) {
        return changes;
    }

    const pendingPackageJson = applyProviderPackageVersions(packageJson, declarations);
    fs.writeFileSync(options.packageJsonPath, `${JSON.stringify(pendingPackageJson, null, 4)}\n`, 'utf-8');
    runInstall('npm', ['install', '--ignore-scripts', '--no-audit'], {
        cwd: options.cwd,
        stdio: 'inherit',
    });
    const installedPackageJson = JSON.parse(fs.readFileSync(options.packageJsonPath, 'utf-8')) as PackageJsonDocument;
    const normalizedPackageJson = applyProviderPackageVersions(installedPackageJson, declarations);
    fs.writeFileSync(options.packageJsonPath, `${JSON.stringify(normalizedPackageJson, null, 4)}\n`, 'utf-8');
    return changes;
}

// Keeps generated package sections deterministic and easy to review.
function sortDependencies(dependencies?: Record<string, string>): Record<string, string> | undefined {
    if (!dependencies || Object.keys(dependencies).length === 0) {
        return undefined;
    }
    return Object.fromEntries(
        Object.entries(dependencies).sort(([left], [right]) => {
            return left.localeCompare(right);
        }),
    );
}

/* v8 ignore start */
// Provides the npm script entrypoint used by developers after editing the provider registry.
function main(): void {
    const checkOnly = process.argv.includes('--check');
    const changes = syncProviderPackages({
        cwd: rootDirectory,
        packageJsonPath: packageJsonPath,
        checkOnly: checkOnly,
    });
    if (changes.length === 0) {
        console.log('Provider packages already in sync.');
        return;
    }

    const packageList = changes.map((change) => {
        return `${change.name}@${change.versionRange}`;
    });
    if (checkOnly) {
        throw new Error(`Provider packages are out of sync: ${packageList.join(', ')}`);
    }
    console.log(`Synced provider packages: ${packageList.join(', ')}`);
}

if (require.main === module) {
    main();
}
/* v8 ignore stop */
