import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coreContainer } from '../inversify.config';
import { CORETYPES } from '../types/types';
import { SkillService } from './SkillService';

describe('SkillService', () => {
    let service: SkillService;
    let tempDir: string;
    const originalCosmoHome = process.env.COSMO_HOME;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
        process.env.COSMO_HOME = tempDir;
        service = new SkillService();
    });

    afterEach(() => {
        if (originalCosmoHome !== undefined) {
            process.env.COSMO_HOME = originalCosmoHome;
        } else {
            delete process.env.COSMO_HOME;
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('always targets ~/.cosmo-studio/skills directory without constructor arguments', () => {
        const skillsDir = service.getSkillsDir();
        expect(skillsDir).toBe(path.join(tempDir, 'skills'));
        expect(fs.existsSync(skillsDir)).toBe(true);
    });

    it('parses valid SKILL.md with frontmatter and markdown body', () => {
        const skillsDir = service.getSkillsDir();
        const skillFolder = path.join(skillsDir, 'sample-skill');
        fs.mkdirSync(skillFolder, { recursive: true });

        const skillMd = `---
name: sample-skill
description: A helpful sample skill
license: MIT
disable-model-invocation: true
metadata:
    category: engineering
---
# Sample Skill Instructions
Follow these steps to complete the task.
`;
        fs.writeFileSync(path.join(skillFolder, 'SKILL.md'), skillMd);

        const manifest = service.parseSkillFile(path.join(skillFolder, 'SKILL.md'));
        expect(manifest).not.toBeNull();
        expect(manifest?.name).toBe('sample-skill');
        expect(manifest?.description).toBe('A helpful sample skill');
        expect(manifest?.license).toBe('MIT');
        expect(manifest?.disableModelInvocation).toBe(true);
        expect(manifest?.content).toContain('# Sample Skill Instructions');
        expect(manifest?.isBuiltIn).toBe(false);
    });

    it('identifies system skills as built-in', () => {
        const skillsDir = service.getSkillsDir();
        const systemSkillFolder = path.join(skillsDir, 'system', 'sys-skill');
        fs.mkdirSync(systemSkillFolder, { recursive: true });

        const skillMd = `---
name: sys-skill
description: A system skill
metadata:
    namespace: system
---
System instructions.
`;
        fs.writeFileSync(path.join(systemSkillFolder, 'SKILL.md'), skillMd);

        const manifest = service.parseSkillFile(path.join(systemSkillFolder, 'SKILL.md'));
        expect(manifest).not.toBeNull();
        expect(manifest?.name).toBe('sys-skill');
        expect(manifest?.isBuiltIn).toBe(true);
    });

    it('discovers all skills recursively in search directories', async () => {
        const skillsDir = service.getSkillsDir();
        const skill1 = path.join(skillsDir, 'skill-one');
        fs.mkdirSync(skill1, { recursive: true });
        fs.writeFileSync(
            path.join(skill1, 'SKILL.md'),
            `---
name: skill-one
description: Skill one
---
Content 1`,
        );

        const skill2 = path.join(skillsDir, 'nested', 'skill-two');
        fs.mkdirSync(skill2, { recursive: true });
        fs.writeFileSync(
            path.join(skill2, 'SKILL.md'),
            `---
name: skill-two
description: Skill two
---
Content 2`,
        );

        const all = await service.getAllSkills();
        const names = all.map((s) => {
            return s.name;
        });
        expect(names).toContain('skill-one');
        expect(names).toContain('skill-two');

        const skillByName = await service.getSkillByName('skill-one');
        expect(skillByName?.name).toBe('skill-one');

        const content = await service.getSkillContent('skill-two');
        expect(content).toBe('Content 2');
    });

    it('seeds built-in skills from repository bundle to ~/.cosmo-studio/skills', async () => {
        const skills = await service.getAllSkills();
        const skillNames = skills.map((s) => {
            return s.name;
        });

        expect(skillNames).toContain('egm-bootstrap');
        expect(skillNames).toContain('run-workflow');

        const egm = await service.getSkillByName('egm-bootstrap');
        expect(egm).toBeDefined();
        expect(egm?.description).toContain('Bootstrap directory README.md files');

        const workflow = await service.getSkillByName('run-workflow');
        expect(workflow).toBeDefined();
        expect(workflow?.isBuiltIn).toBe(true);
    });

    it('uploads a skill from raw markdown content and places it in the skills directory', async () => {
        const uploaded = await service.uploadSkill({
            name: 'markdown-skill',
            content: `---
name: markdown-skill
description: Uploaded via raw markdown
---
# Step-by-step instructions`,
        });

        expect(uploaded.name).toBe('markdown-skill');
        expect(uploaded.description).toBe('Uploaded via raw markdown');
        expect(fs.existsSync(path.join(service.getSkillsDir(), 'markdown-skill', 'SKILL.md'))).toBe(true);

        const content = await service.getSkillContent('markdown-skill');
        expect(content).toContain('# Step-by-step instructions');
    });

    it('uploads a skill from a zip archive and extracts it into the skills directory', async () => {
        const zip = new AdmZip();
        zip.addFile(
            'archived-skill/SKILL.md',
            Buffer.from(`---
name: archived-skill
description: Uploaded from zip
---
# Archive Instructions`),
        );
        zip.addFile('archived-skill/extra.txt', Buffer.from('Extra data'));

        const zipBase64 = zip.toBuffer().toString('base64');
        const uploaded = await service.uploadSkill({
            archiveBase64: zipBase64,
        });

        expect(uploaded.name).toBe('archived-skill');
        expect(uploaded.description).toBe('Uploaded from zip');
        expect(fs.existsSync(path.join(service.getSkillsDir(), 'archived-skill', 'SKILL.md'))).toBe(true);
        expect(fs.existsSync(path.join(service.getSkillsDir(), 'archived-skill', 'extra.txt'))).toBe(true);
    });

    it('handles flat zip archives without a parent directory', async () => {
        const zip = new AdmZip();
        zip.addFile(
            'SKILL.md',
            Buffer.from(`---
name: flat-skill
description: Flat archive
---
# Flat Instructions`),
        );

        const zipBase64 = zip.toBuffer().toString('base64');
        const uploaded = await service.uploadSkill({
            name: 'flat-skill',
            archiveBase64: zipBase64,
        });

        expect(uploaded.name).toBe('flat-skill');
        expect(fs.existsSync(path.join(service.getSkillsDir(), 'flat-skill', 'SKILL.md'))).toBe(true);
    });

    it('throws when uploading an archive without SKILL.md or without data', async () => {
        const zip = new AdmZip();
        zip.addFile('notes.txt', Buffer.from('No skill manifest'));

        await expect(
            service.uploadSkill({
                archiveBase64: zip.toBuffer().toString('base64'),
            }),
        ).rejects.toThrow('SKILL.md file not found');

        await expect(service.uploadSkill({})).rejects.toThrow('Either content or archiveBase64 must be provided');
    });

    it('deletes an uploaded skill by name', async () => {
        await service.uploadSkill({
            name: 'to-delete',
            content: `---
name: to-delete
description: Delete me
---
Body`,
        });

        expect(await service.getSkillByName('to-delete')).toBeDefined();
        const deleted = await service.deleteSkill('to-delete');
        expect(deleted).toBe(true);
        expect(await service.getSkillByName('to-delete')).toBeUndefined();

        const deletedAgain = await service.deleteSkill('to-delete');
        expect(deletedAgain).toBe(false);
    });

    it('resolves from coreContainer without injection error', () => {
        const resolved = coreContainer.get(CORETYPES.SkillService);
        expect(resolved).toBeInstanceOf(SkillService);
    });

    it('returns null when parsing a non-existent file or corrupted file', () => {
        expect(service.parseSkillFile('/non/existent/path/SKILL.md')).toBeNull();

        const unreadable = path.join(tempDir, 'bad-skill', 'SKILL.md');
        fs.mkdirSync(path.dirname(unreadable), { recursive: true });
        fs.writeFileSync(unreadable, 'normal content');
        const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
            throw new Error('read failure');
        });

        expect(service.parseSkillFile(unreadable)).toBeNull();
        readSpy.mockRestore();
    });

    it('ignores directories deeper than max depth and skips node_modules', async () => {
        const deepDir = path.join(tempDir, 'level1', 'level2', 'level3', 'level4', 'deep-skill');
        fs.mkdirSync(deepDir, { recursive: true });
        fs.writeFileSync(path.join(deepDir, 'SKILL.md'), '---\nname: deep-skill\n---\nDeep');

        const nmDir = path.join(tempDir, 'node_modules', 'nm-skill');
        fs.mkdirSync(nmDir, { recursive: true });
        fs.writeFileSync(path.join(nmDir, 'SKILL.md'), '---\nname: nm-skill\n---\nNM');

        const dotDir = path.join(tempDir, '.hidden', 'dot-skill');
        fs.mkdirSync(dotDir, { recursive: true });
        fs.writeFileSync(path.join(dotDir, 'SKILL.md'), '---\nname: dot-skill\n---\nDot');

        const skills = await service.getAllSkills();
        const names = skills.map((s) => {
            return s.name;
        });
        expect(names).not.toContain('deep-skill');
        expect(names).not.toContain('nm-skill');
        expect(names).not.toContain('dot-skill');
    });

    it('returns undefined for non-existent skill by name or content', async () => {
        expect(await service.getSkillByName('non-existent')).toBeUndefined();
        expect(await service.getSkillContent('non-existent')).toBeUndefined();
    });
});
