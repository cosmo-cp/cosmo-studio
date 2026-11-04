import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseManager } from '../database/DatabaseManager';
import { task, taskComment } from '../database/schema/schema';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { TaskCommentRepository } from './TaskCommentRepository';
import { TaskRepository } from './TaskRepository';

describe('TaskCommentRepository', () => {
    let testDb: TestDb;
    let commentRepository: TaskCommentRepository;
    let taskRepository: TaskRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => {
                return testDb.db;
            },
        } as unknown as DatabaseManager;
        commentRepository = new TaskCommentRepository(databaseManager);
        taskRepository = new TaskRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        await testDb.db.delete(taskComment);
        await testDb.db.delete(task);
    });

    it('creates a comment with metadata and timestamp', async () => {
        const parentTask = await taskRepository.create({
            title: 'Parent Task',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        const created = await commentRepository.create({
            taskId: parentTask.id,
            authorType: 'agent',
            authorLabel: 'Claude 3.7',
            content: 'Task completed successfully with tests passing.',
            metadata: { exitCode: 0, executionTimeMs: 1420 },
        });

        expect(created.id).toBeDefined();
        expect(created.taskId).toBe(parentTask.id);
        expect(created.authorType).toBe('agent');
        expect(created.authorLabel).toBe('Claude 3.7');
        expect(created.content).toBe('Task completed successfully with tests passing.');
        expect(created.metadata).toEqual({ exitCode: 0, executionTimeMs: 1420 });
        expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('gets a comment by id or returns undefined', async () => {
        const parentTask = await taskRepository.create({
            title: 'Parent Task',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        const created = await commentRepository.create({
            taskId: parentTask.id,
            authorType: 'human',
            authorLabel: 'Alice',
            content: 'Please verify the changes.',
        });

        const found = await commentRepository.getById(created.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.content).toBe('Please verify the changes.');

        const notFound = await commentRepository.getById('00000000-0000-0000-0000-000000000000');
        expect(notFound).toBeUndefined();
    });

    it('lists comments for a task ordered chronologically', async () => {
        const task1 = await taskRepository.create({
            title: 'Task 1',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });
        const task2 = await taskRepository.create({
            title: 'Task 2',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        const c1 = await commentRepository.create({
            taskId: task1.id,
            authorType: 'human',
            authorLabel: 'User',
            content: 'First note',
        });
        const c2 = await commentRepository.create({
            taskId: task1.id,
            authorType: 'agent',
            authorLabel: 'Agent',
            content: 'Second note',
        });
        const c3 = await commentRepository.create({
            taskId: task2.id,
            authorType: 'system',
            authorLabel: 'System',
            content: 'Other task note',
        });

        const task1Comments = await commentRepository.listByTaskId(task1.id);
        expect(task1Comments).toHaveLength(2);
        expect(task1Comments[0].id).toBe(c1.id);
        expect(task1Comments[1].id).toBe(c2.id);

        const task2Comments = await commentRepository.listByTaskId(task2.id);
        expect(task2Comments).toHaveLength(1);
        expect(task2Comments[0].id).toBe(c3.id);
    });

    it('deletes comments cascade when parent task is deleted', async () => {
        const parentTask = await taskRepository.create({
            title: 'To Delete',
            description: 'Desc',
            workspacePath: '/tmp/ws',
        });

        await commentRepository.create({
            taskId: parentTask.id,
            authorType: 'system',
            authorLabel: 'System',
            content: 'System notice',
        });

        const before = await commentRepository.listByTaskId(parentTask.id);
        expect(before).toHaveLength(1);

        // Delete parent task
        await testDb.db.delete(task).where(eq(task.id, parentTask.id));

        const after = await commentRepository.listByTaskId(parentTask.id);
        expect(after).toHaveLength(0);
    });
});
