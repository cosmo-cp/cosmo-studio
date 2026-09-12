import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import rawRegistry from '../../packages/core/provider-registry/registry.json';
import type { ProviderRegistryDocumentV1 } from '../../packages/core/provider-registry/types';
import {
    applyProviderPackageVersions,
    findProviderPackageChanges,
    getProviderPackageDeclarations,
    syncProviderPackages,
    type ProviderPackageDeclaration,
} from '../sync-provider-packages';

const declarations: ProviderPackageDeclaration[] = [
    { name: '@ai-sdk/example', versionRange: '^1.2.3', dependencyType: 'dependencies' },
    { name: '@ai-sdk/dev-example', versionRange: '2.0.0', dependencyType: 'devDependencies' },
];

describe('sync-provider-packages', () => {
    it('reads unique provider npm packages from the registry', () => {
        const packages = getProviderPackageDeclarations(rawRegistry as ProviderRegistryDocumentV1);

        expect(packages).toContainEqual({
            name: '@ai-sdk/openai-compatible',
            versionRange: '^3.0.20',
            dependencyType: 'dependencies',
        });
        expect(
            packages.filter((providerPackage) => {
                return providerPackage.name === '@ai-sdk/openai-compatible';
            }),
        ).toHaveLength(1);
    });

    it('detects missing versions and dependency bucket moves', () => {
        const changes = findProviderPackageChanges(
            {
                dependencies: { '@ai-sdk/example': '^1.0.0' },
                devDependencies: { '@ai-sdk/dev-example': '2.0.0', '@ai-sdk/moved': '^1.0.0' },
            },
            [...declarations, { name: '@ai-sdk/moved', versionRange: '^1.0.0', dependencyType: 'dependencies' }],
        );

        expect(changes).toEqual([
            {
                name: '@ai-sdk/example',
                versionRange: '^1.2.3',
                dependencyType: 'dependencies',
                currentVersion: '^1.0.0',
                currentDependencyType: 'dependencies',
            },
            {
                name: '@ai-sdk/moved',
                versionRange: '^1.0.0',
                dependencyType: 'dependencies',
                currentVersion: '^1.0.0',
                currentDependencyType: 'devDependencies',
            },
        ]);
    });

    it('normalizes package json sections to registry declarations', () => {
        const packageJson = applyProviderPackageVersions(
            {
                dependencies: { zod: '4.4.3' },
                devDependencies: { '@ai-sdk/example': '^1.2.3', typescript: '^6.0.3' },
            },
            declarations,
        );

        expect(packageJson).toEqual({
            dependencies: { '@ai-sdk/example': '^1.2.3', zod: '4.4.3' },
            devDependencies: { '@ai-sdk/dev-example': '2.0.0', typescript: '^6.0.3' },
        });
    });

    it('installs and rewrites package json when provider packages are out of sync', () => {
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-package-sync-'));
        const packageJsonPath = path.join(tempDirectory, 'package.json');
        fs.writeFileSync(
            packageJsonPath,
            JSON.stringify({
                name: 'test-project',
                dependencies: { '@ai-sdk/openai': '4.0.27' },
            }),
            'utf-8',
        );
        const installCalls: string[][] = [];

        const changes = syncProviderPackages(
            { cwd: tempDirectory, packageJsonPath: packageJsonPath, checkOnly: false },
            (_command, args) => {
                installCalls.push(args);
            },
        );

        expect(changes.length).toBeGreaterThan(0);
        expect(installCalls).toEqual([['install', '--ignore-scripts', '--no-audit']]);
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
            dependencies: Record<string, string>;
            devDependencies?: Record<string, string>;
        };
        expect(packageJson.dependencies['@ai-sdk/groq']).toBe('^4.0.19');
        expect(packageJson.devDependencies?.['@ai-sdk/groq']).toBeUndefined();
    });

    it('reports changes without installing in check mode', () => {
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-package-check-'));
        const packageJsonPath = path.join(tempDirectory, 'package.json');
        fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test-project' }), 'utf-8');
        const installCalls: string[][] = [];

        const changes = syncProviderPackages(
            { cwd: tempDirectory, packageJsonPath: packageJsonPath, checkOnly: true },
            (_command, args) => {
                installCalls.push(args);
            },
        );

        expect(changes.length).toBeGreaterThan(0);
        expect(installCalls).toHaveLength(0);
        expect(JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))).toEqual({ name: 'test-project' });
    });

    it('skips installation when package json already matches the registry', () => {
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-package-ready-'));
        const packageJsonPath = path.join(tempDirectory, 'package.json');
        const providerPackages = getProviderPackageDeclarations(rawRegistry as ProviderRegistryDocumentV1);
        fs.writeFileSync(
            packageJsonPath,
            JSON.stringify({
                name: 'test-project',
                dependencies: Object.fromEntries(
                    providerPackages.map((providerPackage) => {
                        return [providerPackage.name, providerPackage.versionRange];
                    }),
                ),
            }),
            'utf-8',
        );
        const installCalls: string[][] = [];

        const changes = syncProviderPackages(
            { cwd: tempDirectory, packageJsonPath: packageJsonPath, checkOnly: false },
            (_command, args) => {
                installCalls.push(args);
            },
        );

        expect(changes).toHaveLength(0);
        expect(installCalls).toHaveLength(0);
    });
});
