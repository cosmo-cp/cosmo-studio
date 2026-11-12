import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Workspace } from '../../dto';
import { WorkspaceRepository } from '../../repositories/WorkspaceRepository';
import { WorkspaceService } from '../WorkspaceService';

describe('WorkspaceService', () => {
    let service: WorkspaceService;
    let mockRepo: {
        listAll: ReturnType<typeof vi.fn>;
        getById: ReturnType<typeof vi.fn>;
        findByCanonicalPath: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };

    let tempDir: string;
    let tempFile: string;

    beforeAll(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cosmo-ws-srv-test-'));
        tempFile = path.join(tempDir, 'file.txt');
        await fs.promises.writeFile(tempFile, 'data');
    });

    afterAll(async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        mockRepo = {
            listAll: vi.fn(),
            getById: vi.fn(),
            findByCanonicalPath: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        service = new WorkspaceService(mockRepo as unknown as WorkspaceRepository);
    });

    it('lists all workspaces', async () => {
        const fakeList: Workspace[] = [
            {
                id: '1',
                name: 'ws1',
                canonicalPath: '/p1',
                rawPath: '/p1',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        mockRepo.listAll.mockResolvedValue(fakeList);

        const result = await service.list();
        expect(result).toEqual(fakeList);
        expect(mockRepo.listAll).toHaveBeenCalled();
    });

    it('gets a workspace by id', async () => {
        const fakeWs: Workspace = {
            id: 'ws-123',
            name: 'ws1',
            canonicalPath: '/p1',
            rawPath: '/p1',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mockRepo.getById.mockResolvedValue(fakeWs);

        const result = await service.get('ws-123');
        expect(result).toEqual(fakeWs);
        expect(mockRepo.getById).toHaveBeenCalledWith('ws-123');
    });

    it('creates a workspace with valid directory and auto-derives name', async () => {
        mockRepo.findByCanonicalPath.mockResolvedValue(undefined);
        mockRepo.create.mockImplementation(async (data) => {
            return {
                id: 'new-id',
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        });

        const canonical = await fs.promises.realpath(tempDir);
        const created = await service.create({ path: tempDir });

        expect(mockRepo.create).toHaveBeenCalledWith({
            name: path.basename(canonical),
            canonicalPath: canonical,
            rawPath: tempDir,
        });
        expect(created.id).toBe('new-id');
    });

    it('creates a workspace with custom name', async () => {
        mockRepo.findByCanonicalPath.mockResolvedValue(undefined);
        mockRepo.create.mockImplementation(async (data) => {
            return {
                id: 'new-id',
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        });

        const canonical = await fs.promises.realpath(tempDir);
        await service.create({ path: tempDir, name: 'My Custom Project' });

        expect(mockRepo.create).toHaveBeenCalledWith({
            name: 'My Custom Project',
            canonicalPath: canonical,
            rawPath: tempDir,
        });
    });

    it('throws error when path is invalid', async () => {
        await expect(service.create({ path: '' })).rejects.toThrow('Path must not be empty');
        await expect(service.create({ path: tempFile })).rejects.toThrow('Path is not a directory');
    });

    it('throws error on duplicate path registration', async () => {
        const canonical = await fs.promises.realpath(tempDir);
        mockRepo.findByCanonicalPath.mockResolvedValue({
            id: 'existing-id',
            name: 'Existing',
            canonicalPath: canonical,
            rawPath: tempDir,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await expect(service.create({ path: tempDir })).rejects.toThrow('A workspace with this path already exists');
    });

    it('updates a workspace name', async () => {
        const canonical = await fs.promises.realpath(tempDir);
        const existing: Workspace = {
            id: 'ws-1',
            name: 'Old Name',
            canonicalPath: canonical,
            rawPath: tempDir,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mockRepo.getById.mockResolvedValue(existing);
        mockRepo.update.mockResolvedValue({ ...existing, name: 'New Name' });

        const updated = await service.update('ws-1', { name: 'New Name' });
        expect(updated.name).toBe('New Name');
        expect(mockRepo.update).toHaveBeenCalledWith('ws-1', { name: 'New Name' });
    });

    it('updates a workspace path and rejects duplicate paths on another workspace', async () => {
        const canonical = await fs.promises.realpath(tempDir);
        const existing: Workspace = {
            id: 'ws-1',
            name: 'WS1',
            canonicalPath: '/other/path',
            rawPath: '/other/path',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mockRepo.getById.mockResolvedValue(existing);
        mockRepo.findByCanonicalPath.mockResolvedValue({
            id: 'ws-2',
            name: 'WS2',
            canonicalPath: canonical,
            rawPath: tempDir,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await expect(service.update('ws-1', { path: tempDir })).rejects.toThrow(
            'A workspace with this path already exists',
        );
    });

    it('throws error when updating non-existent workspace or with empty name', async () => {
        mockRepo.getById.mockResolvedValue(undefined);
        await expect(service.update('missing', { name: 'New' })).rejects.toThrow('Workspace not found');

        mockRepo.getById.mockResolvedValue({ id: 'exists' });
        await expect(service.update('exists', { name: '   ' })).rejects.toThrow('Workspace name must not be empty');
    });

    it('relocates workspace path', async () => {
        const canonical = await fs.promises.realpath(tempDir);
        const existing: Workspace = {
            id: 'ws-1',
            name: 'WS1',
            canonicalPath: '/old/path',
            rawPath: '/old/path',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        mockRepo.getById.mockResolvedValue(existing);
        mockRepo.findByCanonicalPath.mockResolvedValue(undefined);
        mockRepo.update.mockResolvedValue({
            ...existing,
            canonicalPath: canonical,
            rawPath: tempDir,
        });

        const relocated = await service.relocatePath('ws-1', tempDir);
        expect(relocated.canonicalPath).toBe(canonical);
    });

    it('deletes an existing workspace and returns false if not found', async () => {
        mockRepo.getById.mockResolvedValue({ id: 'ws-1' });
        mockRepo.delete.mockResolvedValue(true);

        const result = await service.delete('ws-1');
        expect(result).toBe(true);

        mockRepo.getById.mockResolvedValue(undefined);
        const result2 = await service.delete('ws-missing');
        expect(result2).toBe(false);
    });

    describe('validateReachability', () => {
        it('returns reachable true for valid directory path', async () => {
            const canonical = await fs.promises.realpath(tempDir);
            const res = await service.validateReachability(canonical);
            expect(res.reachable).toBe(true);
            expect(res.canonicalPath).toBe(canonical);
        });

        it('resolves symlink aliases to the real directory', async () => {
            const alias = path.join(tempDir, 'alias');
            await fs.promises.symlink(tempDir, alias);
            const res = await service.validateReachability(alias);
            expect(res.canonicalPath).toBe(await fs.promises.realpath(tempDir));
        });

        it('does not query getById when given a filesystem path', async () => {
            const canonical = await fs.promises.realpath(tempDir);
            mockRepo.getById.mockClear();
            mockRepo.findByCanonicalPath.mockResolvedValue(undefined);
            const res = await service.validateReachability(canonical);
            expect(mockRepo.getById).not.toHaveBeenCalled();
            expect(res.reachable).toBe(true);
            expect(res.canonicalPath).toBe(canonical);
        });

        it('returns reachable true when given a workspace ID', async () => {
            const canonical = await fs.promises.realpath(tempDir);
            const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
            mockRepo.getById.mockResolvedValue({
                id: validUuid,
                canonicalPath: canonical,
            });

            const res = await service.validateReachability(validUuid);
            expect(res.reachable).toBe(true);
            expect(res.canonicalPath).toBe(canonical);
        });

        it('returns reachable false if path does not exist', async () => {
            mockRepo.getById.mockResolvedValue(undefined);
            const res = await service.validateReachability('/path/does/not/exist-' + Date.now());
            expect(res.reachable).toBe(false);
            expect(res.error).toContain('does not exist or is inaccessible');
        });

        it('returns reachable false if path is a file', async () => {
            mockRepo.getById.mockResolvedValue(undefined);
            const res = await service.validateReachability(tempFile);
            expect(res.reachable).toBe(false);
            expect(res.error).toContain('is not a directory');
        });
    });
});
