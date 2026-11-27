import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { injectable } from 'inversify';
import * as jsYaml from 'js-yaml';
import { SkillManifest, SkillUploadInput } from '../dto';
import { getCoreLogger } from '../platform/CoreLogger';
import { CosmoPaths } from '../platform/CosmoPaths';

function safeYamlLoad(content: string): unknown {
    const loader =
        (jsYaml as unknown as { load?: (s: string) => unknown; default?: { load?: (s: string) => unknown } }).load ??
        (jsYaml as unknown as { default?: { load?: (s: string) => unknown } }).default?.load;

    if (typeof loader === 'function') {
        try {
            return loader(content);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function findBundledSkillsDir(startDir: string): string | null {
    let current = path.resolve(startDir);
    while (true) {
        const candidate = path.join(current, 'skills');
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
                return candidate;
            }
        } catch {
            // Ignore inaccessible directories
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return null;
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
    constructor() {
        this.ensureSkillsDirectory();
        this.seedBuiltInSkills();
    }

    /**
     * Resolves the canonical skills directory located at ~/.cosmo-studio/skills.
     */
    public getSkillsDir(): string {
        return CosmoPaths.getSkillsDir();
    }

    /**
     * Ensures the central ~/.cosmo-studio/skills directory exists.
     */
    public ensureSkillsDirectory(): string {
        const skillsDir = this.getSkillsDir();
        try {
            if (!fs.existsSync(skillsDir)) {
                fs.mkdirSync(skillsDir, { recursive: true });
            }
        } catch (error) {
            getCoreLogger().warn(`Failed to create skills directory at ${skillsDir}`, error);
        }
        return skillsDir;
    }

    /**
     * Seeds built-in skills from the application bundle into ~/.cosmo-studio/skills if not present.
     */
    public seedBuiltInSkills(): void {
        const targetDir = this.ensureSkillsDirectory();
        const candidates = [
            path.resolve(__dirname, '../../../skills'),
            path.resolve(__dirname, '../../skills'),
            path.resolve(process.cwd(), 'skills'),
            findBundledSkillsDir(__dirname),
            findBundledSkillsDir(process.cwd()),
        ].filter(Boolean) as string[];

        for (const candidate of candidates) {
            try {
                if (path.resolve(candidate) === path.resolve(targetDir)) {
                    continue;
                }
                if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
                    const entries = fs.readdirSync(candidate, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                            const dest = path.join(targetDir, entry.name);
                            if (!fs.existsSync(dest)) {
                                fs.cpSync(path.join(candidate, entry.name), dest, { recursive: true });
                            }
                        }
                    }
                    break;
                }
            } catch {
                // Ignore seed errors
            }
        }
    }

    /**
     * Resolves unique existing directories to scan for skills.
     * Always points to ~/.cosmo-studio/skills.
     */
    public getSearchDirectories(extraDirs?: string[]): string[] {
        const base = this.ensureSkillsDirectory();
        const candidates = [base, ...(extraDirs ?? [])];
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
            return this.parseSkillContent(rawContent, path.dirname(filePath));
        } catch (error) {
            getCoreLogger().warn(`Failed to parse skill file at ${filePath}`, error);
            return null;
        }
    }

    /**
     * Parses raw skill markdown content and frontmatter into a SkillManifest.
     */
    public parseSkillContent(rawContent: string, skillDir: string): SkillManifest | null {
        try {
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

            const dirName = path.basename(skillDir || '');
            const skillName = frontmatter.name?.trim() || dirName || 'unknown-skill';

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
            getCoreLogger().warn('Failed to parse skill content', error);
            return null;
        }
    }

    /**
     * Discovers all skills from the ~/.cosmo-studio/skills directory.
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

    /**
     * Uploads and installs a skill into ~/.cosmo-studio/skills/.
     * Supports both .zip archives and raw SKILL.md content.
     */
    public async uploadSkill(input: SkillUploadInput): Promise<SkillManifest> {
        const skillsDir = this.ensureSkillsDirectory();

        if (input.archiveBase64) {
            const buffer = Buffer.from(input.archiveBase64, 'base64');
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();

            const skillMdEntry = entries.find((e) => {
                return (
                    !e.isDirectory &&
                    (e.entryName.toLowerCase() === 'skill.md' || e.entryName.toLowerCase().endsWith('/skill.md'))
                );
            });

            if (!skillMdEntry) {
                throw new Error('Invalid skill archive: SKILL.md file not found in package.');
            }

            const rawContent = skillMdEntry.getData().toString('utf-8');
            const meta = this.parseSkillContent(rawContent, '');
            const rawName =
                input.name?.trim() ||
                meta?.name?.trim() ||
                path.basename(path.dirname(skillMdEntry.entryName)) ||
                'uploaded-skill';

            const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
            const targetDir = path.join(skillsDir, safeName);

            const prefix = path.dirname(skillMdEntry.entryName);
            if (prefix && prefix !== '.') {
                for (const entry of entries) {
                    if (entry.entryName.startsWith(prefix)) {
                        const relative = entry.entryName.substring(prefix.length).replace(/^[/\\]+/, '');
                        if (!relative) continue;
                        const dest = path.join(targetDir, relative);
                        if (entry.isDirectory) {
                            fs.mkdirSync(dest, { recursive: true });
                        } else {
                            fs.mkdirSync(path.dirname(dest), { recursive: true });
                            fs.writeFileSync(dest, entry.getData());
                        }
                    }
                }
            } else {
                zip.extractAllTo(targetDir, true);
            }

            const manifest = this.parseSkillFile(path.join(targetDir, 'SKILL.md'));
            if (!manifest) {
                throw new Error('Failed to parse uploaded skill manifest.');
            }
            return manifest;
        }

        if (input.content) {
            const meta = this.parseSkillContent(input.content, '');
            const rawName = input.name?.trim() || meta?.name?.trim() || 'custom-skill';
            const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

            const targetDir = path.join(skillsDir, safeName);
            fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(path.join(targetDir, 'SKILL.md'), input.content, 'utf-8');

            const manifest = this.parseSkillFile(path.join(targetDir, 'SKILL.md'));
            if (!manifest) {
                throw new Error('Failed to parse uploaded skill content.');
            }
            return manifest;
        }

        throw new Error('Either content or archiveBase64 must be provided to upload a skill.');
    }

    /**
     * Deletes a skill folder from ~/.cosmo-studio/skills/.
     */
    public async deleteSkill(name: string): Promise<boolean> {
        const skillsDir = this.ensureSkillsDirectory();
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
        const targetDir = path.join(skillsDir, safeName);

        if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
            fs.rmSync(targetDir, { recursive: true, force: true });
            return true;
        }
        return false;
    }
}
