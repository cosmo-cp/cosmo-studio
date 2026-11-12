import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseManager } from '../database/DatabaseManager';
import { workspace } from '../database/schema/schema';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { WorkspaceRepository } from './WorkspaceRepository';

describe('WorkspaceRepository', () => {
    let testDb: TestDb;
    let repository: WorkspaceRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => {
                return testDb.db;
            },
        } as unknown as DatabaseManager;
        repository = new WorkspaceRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        await testDb.db.delete(workspace);
    });

    it('creates a workspace with timestamps and returns it', async () => {
        const created = await repository.create({
            name: 'my-project',
            canonicalPath: '/Users/test/projects/my-project',
            rawPath: '~/projects/my-project',
        });

        expect(created.id).toBeDefined();
        expect(created.name).toBe('my-project');
        expect(created.canonicalPath).toBe('/Users/test/projects/my-project');
        expect(created.rawPath).toBe('~/projects/my-project');
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('gets a workspace by id', async () => {
        const created = await repository.create({
            name: 'repo-a',
            canonicalPath: '/path/repo-a',
            rawPath: '/path/repo-a',
        });

        const found = await repository.getById(created.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);

        const notFound = await repository.getById('00000000-0000-0000-0000-000000000000');
        expect(notFound).toBeUndefined();

        const nonUuid = await repository.getById('/Users/gauravsaini/repos/cosmocp-desktop');
        expect(nonUuid).toBeUndefined();
    });

    it('finds a workspace by canonical path', async () => {
        await repository.create({
            name: 'repo-b',
            canonicalPath: '/path/repo-b',
            rawPath: '/path/repo-b',
        });

        const found = await repository.findByCanonicalPath('/path/repo-b');
        expect(found).toBeDefined();
        expect(found?.name).toBe('repo-b');

        const notFound = await repository.findByCanonicalPath('/path/repo-missing');
        expect(notFound).toBeUndefined();
    });

    it('lists all workspaces ordered by creation date descending', async () => {
        await repository.create({
            name: 'first',
            canonicalPath: '/path/first',
            rawPath: '/path/first',
            createdAt: new Date('2026-01-01T00:00:00Z'),
        });
        await repository.create({
            name: 'second',
            canonicalPath: '/path/second',
            rawPath: '/path/second',
            createdAt: new Date('2026-01-02T00:00:00Z'),
        });

        const list = await repository.listAll();
        expect(list.length).toBe(2);
        expect(list[0].name).toBe('second');
        expect(list[1].name).toBe('first');
    });

    it('updates a workspace name and path', async () => {
        const created = await repository.create({
            name: 'old-name',
            canonicalPath: '/path/old',
            rawPath: '/path/old',
        });

        const updated = await repository.update(created.id, {
            name: 'new-name',
            canonicalPath: '/path/new',
            rawPath: '/path/new',
        });

        expect(updated).toBeDefined();
        expect(updated?.name).toBe('new-name');
        expect(updated?.canonicalPath).toBe('/path/new');
    });

    it('deletes a workspace by id', async () => {
        const created = await repository.create({
            name: 'to-delete',
            canonicalPath: '/path/delete',
            rawPath: '/path/delete',
        });

        const deleted = await repository.delete(created.id);
        expect(deleted).toBe(true);

        const check = await repository.getById(created.id);
        expect(check).toBeUndefined();

        const deleteAgain = await repository.delete(created.id);
        expect(deleteAgain).toBe(false);
    });
});
