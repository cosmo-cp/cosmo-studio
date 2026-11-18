import fs from 'fs';
import path from 'path';
import { injectable } from 'inversify';
import * as jsYaml from 'js-yaml';
import { SkillManifest } from '../dto';
import { getCoreLogger } from '../platform/CoreLogger';

function safeYamlLoad(content: string): unknown {
    const loader =
        (jsYaml as unknown as { load?: (s: string) => unknown; default?: { load?: (s: string) => unknown } }).load ??
        (jsYaml as unknown as { default?: { load?: (s: string) => unknown } }).default?.load;

    if (typeof loader === 'function') {
        return loader(content);
    }
    return undefined;
}

export interface RawSkillFrontmatter {
    name?: string;
    description?: string;
    license?: string;
    'disable-model-invocation'?: boolean;
    disableModelInvocation?: boolean;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

@injectable()
export class SkillService {
    private defaultSearchDirs: string[];

    constructor(customSearchDirs?: string[]) {
        this.defaultSearchDirs = customSearchDirs ?? [
            path.resolve(process.cwd(), 'skills'),
            path.resolve(__dirname, '../../../skills'),
        ];
    }

    /**
     * Resolves unique existing directories to scan for skills.
     */
    public getSearchDirectories(extraDirs?: string[]): string[] {
        const candidates = [...(extraDirs ?? []), ...this.defaultSearchDirs];
        const existing = new Set<string>();

        for (const dir of candidates) {
            try {
                if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                    existing.add(path.resolve(dir));
                }
            } catch {
                // Ignore inaccessible directories
            }
        }

        return Array.from(existing);
    }

    /**
     * Parse SKILL.md file into a SkillManifest.
     */
    public parseSkillFile(filePath: string): SkillManifest | null {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const rawContent = fs.readFileSync(filePath, 'utf-8');
            const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

            let frontmatter: RawSkillFrontmatter = {};
            let body = rawContent;

            if (frontmatterMatch) {
                const parsed = safeYamlLoad(frontmatterMatch[1]);
                if (parsed && typeof parsed === 'object') {
                    frontmatter = parsed as RawSkillFrontmatter;
                }
                body = frontmatterMatch[2]?.trim() ?? '';
            }

            const skillDir = path.dirname(filePath);
            const dirName = path.basename(skillDir);
            const skillName = frontmatter.name?.trim() || dirName;

            const isBuiltIn =
                Boolean(frontmatter.metadata?.namespace === 'system') ||
                skillDir.includes(`${path.sep}system${path.sep}`) ||
                skillDir.endsWith(`${path.sep}system`);

            return {
                name: skillName,
                description: frontmatter.description?.trim() || '',
                path: skillDir,
                license: frontmatter.license,
                disableModelInvocation:
                    frontmatter['disable-model-invocation'] ?? frontmatter.disableModelInvocation ?? false,
                metadata: frontmatter.metadata,
                content: body,
                isBuiltIn: isBuiltIn,
            };
        } catch (error) {
            getCoreLogger().warn(`Failed to parse skill file at ${filePath}`, error);
            return null;
        }
    }

    /**
     * Discovers all skills from the search directories.
     */
    public async getAllSkills(extraDirs?: string[]): Promise<SkillManifest[]> {
        const dirs = this.getSearchDirectories(extraDirs);
        const skillsMap = new Map<string, SkillManifest>();

        for (const baseDir of dirs) {
            this.scanDirectoryForSkills(baseDir, skillsMap, 0, 3);
        }

        return Array.from(skillsMap.values()).sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Recursively scans for directories containing SKILL.md.
     */
    private scanDirectoryForSkills(
        dir: string,
        skillsMap: Map<string, SkillManifest>,
        currentDepth: number,
        maxDepth: number,
    ): void {
        if (currentDepth > maxDepth) {
            return;
        }

        try {
            const skillMdPath = path.join(dir, 'SKILL.md');
            if (fs.existsSync(skillMdPath)) {
                const manifest = this.parseSkillFile(skillMdPath);
                if (manifest && !skillsMap.has(manifest.name)) {
                    skillsMap.set(manifest.name, manifest);
                }
            }

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                        continue;
                    }
                    this.scanDirectoryForSkills(path.join(dir, entry.name), skillsMap, currentDepth + 1, maxDepth);
                }
            }
        } catch {
            // Ignore unreadable subdirectories
        }
    }

    /**
     * Find a skill by its unique name.
     */
    public async getSkillByName(name: string, extraDirs?: string[]): Promise<SkillManifest | undefined> {
        const allSkills = await this.getAllSkills(extraDirs);
        return allSkills.find((s) => {
            return s.name === name;
        });
    }

    /**
     * Retrieve the markdown prompt instructions for a skill.
     */
    public async getSkillContent(name: string, extraDirs?: string[]): Promise<string | undefined> {
        const skill = await this.getSkillByName(name, extraDirs);
        return skill?.content;
    }
}
