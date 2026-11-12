import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseManager } from '../database/DatabaseManager';
import { task, taskComment } from '../database/schema/schema';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { TaskRepository } from './TaskRepository';

describe('TaskRepository', () => {
    let testDb: TestDb;
    let repository: TaskRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => {
                return testDb.db;
            },
        } as unknown as DatabaseManager;
        repository = new TaskRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        await testDb.db.delete(taskComment);
        await testDb.db.delete(task);
    });

    it('creates a task with defaults and timestamps', async () => {
        const created = await repository.create({
            title: 'Build Feature',
            description: 'Implement core domain',
            workspacePath: '/tmp/workspace',
            runtime: 'model',
            provider: 'anthropic',
            modelId: 'claude-3-7-sonnet',
        });

        expect(created.id).toBeDefined();
        expect(created.title).toBe('Build Feature');
        expect(created.description).toBe('Implement core domain');
        expect(created.status).toBe('not_started');
        expect(created.workspacePath).toBe('/tmp/workspace');
        expect(created.runtime).toBe('model');
        expect(created.provider).toBe('anthropic');
        expect(created.modelId).toBe('claude-3-7-sonnet');
        expect(created.nextTaskId).toBeNull();
        expect(created.closedAt).toBeNull();
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('gets a task by id or returns undefined if not found', async () => {
        const created = await repository.create({
            title: 'Task A',
            description: 'Desc A',
            workspacePath: '/tmp/ws',
        });

        const found = await repository.getById(created.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);

        const notFound = await repository.getById('00000000-0000-0000-0000-000000000000');
        expect(notFound).toBeUndefined();
    });

    it('lists tasks excluding closed by default and respects filters', async () => {
        const task1 = await repository.create({
            title: 'Active Task',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });
        const task2 = await repository.create({
            title: 'Done Task',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });
        await repository.updateStatus(task2.id, 'done');

        const task3 = await repository.create({
            title: 'Closed Task',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });
        await repository.close(task3.id);

        // Default list excludes closed
        const defaultList = await repository.list();
        expect(defaultList).toHaveLength(2);
        const ids = defaultList.map((t) => {
            return t.id;
        });
        expect(ids).toContain(task1.id);
        expect(ids).toContain(task2.id);
        expect(ids).not.toContain(task3.id);

        // Include closed
        const allList = await repository.list({ includeClosed: true });
        expect(allList).toHaveLength(3);

        // Filter by status 'done'
        const doneList = await repository.list({ status: 'done' });
        expect(doneList).toHaveLength(1);
        expect(doneList[0].id).toBe(task2.id);

        // Filter by status 'closed' with includeClosed: true
        const closedList = await repository.list({ status: 'closed', includeClosed: true });
        expect(closedList).toHaveLength(1);
        expect(closedList[0].id).toBe(task3.id);
    });

    it('finds predecessor task pointing to a target task', async () => {
        const taskA = await repository.create({
            title: 'Task A',
            description: 'First',
            workspacePath: '/tmp/ws',
        });
        const taskB = await repository.create({
            title: 'Task B',
            description: 'Second',
            workspacePath: '/tmp/ws',
        });

        expect(await repository.getPredecessor(taskB.id)).toBeUndefined();

        await repository.update(taskA.id, { nextTaskId: taskB.id });

        const pred = await repository.getPredecessor(taskB.id);
        expect(pred).toBeDefined();
        expect(pred?.id).toBe(taskA.id);
    });

    it('resolves bidirectional links in getWithLinks', async () => {
        const taskA = await repository.create({
            title: 'Task A',
            description: 'First',
            workspacePath: '/tmp/ws',
        });
        const taskB = await repository.create({
            title: 'Task B',
            description: 'Second',
            workspacePath: '/tmp/ws',
        });
        const taskC = await repository.create({
            title: 'Task C',
            description: 'Third',
            workspacePath: '/tmp/ws',
        });

        // Link A -> B -> C
        await repository.update(taskA.id, { nextTaskId: taskB.id });
        await repository.update(taskB.id, { nextTaskId: taskC.id });

        // Non-existent task returns undefined
        const notFound = await repository.getWithLinks('00000000-0000-0000-0000-000000000000');
        expect(notFound).toBeUndefined();

        // Inspect Task A (has nextTask B, previousTask is null)
        const linksA = await repository.getWithLinks(taskA.id);
        expect(linksA?.nextTask?.id).toBe(taskB.id);
        expect(linksA?.previousTask).toBeNull();

        // Inspect Task B (has nextTask C, previousTask A)
        const linksB = await repository.getWithLinks(taskB.id);
        expect(linksB?.nextTask?.id).toBe(taskC.id);
        expect(linksB?.previousTask?.id).toBe(taskA.id);

        // Inspect Task C (has nextTask null, previousTask B)
        const linksC = await repository.getWithLinks(taskC.id);
        expect(linksC?.nextTask).toBeNull();
        expect(linksC?.previousTask?.id).toBe(taskB.id);

        // Test fallback when nextTaskId points to a task that returns undefined from getById
        vi.spyOn(repository, 'getById')
            .mockResolvedValueOnce({ ...taskA, nextTaskId: '00000000-0000-0000-0000-000000000000' })
            .mockResolvedValueOnce(undefined);
        const linksOrphan = await repository.getWithLinks(taskA.id);
        expect(linksOrphan?.nextTask).toBeNull();
        vi.restoreAllMocks();
    });

    it('updates task fields and updates timestamp', async () => {
        const created = await repository.create({
            title: 'Initial Title',
            description: 'Initial Desc',
            workspacePath: '/tmp/initial',
        });

        const updated = await repository.update(created.id, {
            title: 'Updated Title',
            description: 'Updated Desc',
            workspacePath: '/tmp/updated',
        });

        expect(updated.title).toBe('Updated Title');
        expect(updated.description).toBe('Updated Desc');
        expect(updated.workspacePath).toBe('/tmp/updated');
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('soft-closes a task with closedAt timestamp', async () => {
        const created = await repository.create({
            title: 'To Close',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        const closed = await repository.close(created.id);
        expect(closed.status).toBe('closed');
        expect(closed.closedAt).toBeInstanceOf(Date);

        const fetched = await repository.getById(created.id);
        expect(fetched?.status).toBe('closed');
        expect(fetched?.closedAt).toBeDefined();
    });

    it('updates status and lists tasks by status', async () => {
        const task1 = await repository.create({
            title: 'Running 1',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });
        const task2 = await repository.create({
            title: 'Running 2',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        await repository.updateStatus(task1.id, 'in_progress');
        await repository.updateStatus(task2.id, 'in_progress');

        const inProgress = await repository.listByStatus('in_progress');
        expect(inProgress).toHaveLength(2);
        const ids = inProgress.map((t) => {
            return t.id;
        });
        expect(ids).toContain(task1.id);
        expect(ids).toContain(task2.id);
    });

    it('sets nextTaskId to null when referenced target task is deleted (foreign key set null)', async () => {
        const taskA = await repository.create({
            title: 'Task A',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });
        const taskB = await repository.create({
            title: 'Task B',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        await repository.update(taskA.id, { nextTaskId: taskB.id });
        expect((await repository.getById(taskA.id))?.nextTaskId).toBe(taskB.id);

        // Delete target task B directly from table
        await testDb.db.delete(task).where(eq(task.id, taskB.id));

        const afterDeleteA = await repository.getById(taskA.id);
        expect(afterDeleteA?.nextTaskId).toBeNull();
    });
});
