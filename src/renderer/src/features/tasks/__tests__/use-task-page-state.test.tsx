import { StoreProvider } from '@/app/store-provider';
import { useTaskPageState } from '@/features/tasks/use-task-page-state';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Task, TaskComment, TaskWithLinks } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockTask1: Task = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Alpha Task',
    description: 'Alpha description',
    workspacePath: '/path/alpha',
    workspaceId: null,
    runtime: 'model',
    provider: 'openai',
    modelId: 'gpt-4o',
    agentId: null,
    status: 'not_started',
    nextTaskId: null,
    closedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockTask2: Task = {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Beta Task',
    description: 'Beta description',
    workspacePath: '/path/beta',
    workspaceId: null,
    runtime: 'agent',
    provider: null,
    modelId: null,
    agentId: '33333333-3333-4333-8333-333333333333',
    status: 'done',
    nextTaskId: null,
    closedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockTaskClosed: Task = {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Closed Task',
    description: 'Closed description',
    workspacePath: '/path/closed',
    workspaceId: null,
    runtime: 'model',
    provider: 'openai',
    modelId: 'gpt-4o',
    agentId: null,
    status: 'closed',
    nextTaskId: null,
    closedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

function createWrapper(overrides = {}) {
    const dataSource = createMockAppDataSource(overrides);
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <StoreProvider appDataSource={dataSource}>{children}</StoreProvider>;
    };
}

describe('useTaskPageState', () => {
    it('initializes tasks and handles search & status filters', async () => {
        const wrapper = createWrapper({
            task: {
                list: vi.fn().mockResolvedValue([mockTask1, mockTask2, mockTaskClosed]),
                get: vi.fn().mockResolvedValue({ ...mockTask1, nextTask: null, previousTask: null }),
                listComments: vi.fn().mockResolvedValue([]),
            },
        });

        const { result } = renderHook(() => useTaskPageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.allTasks).toHaveLength(3);
        });

        // 'all' filter excludes closed tasks by default
        expect(result.current.tasks).toHaveLength(2);
        expect(result.current.selectedTaskId).toBeNull();

        // Filter by status 'done'
        act(() => {
            result.current.setStatusFilter('done');
        });
        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.tasks[0].id).toBe(mockTask2.id);

        // Filter by status 'closed'
        act(() => {
            result.current.setStatusFilter('closed');
        });
        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.tasks[0].id).toBe(mockTaskClosed.id);

        // Reset filter and test search query
        act(() => {
            result.current.setStatusFilter('all');
            result.current.setSearchQuery('Beta');
        });
        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.tasks[0].id).toBe(mockTask2.id);
    });

    it('triggers handlers for create, update, close, overrideStatus, link, unlink, execute, cancel, comment', async () => {
        const createMock = vi.fn().mockResolvedValue(mockTask1);
        const updateMock = vi.fn().mockResolvedValue(mockTask1);
        const closeMock = vi.fn().mockResolvedValue({ ...mockTask1, status: 'closed' });
        const overrideMock = vi.fn().mockResolvedValue({ ...mockTask1, status: 'done' });
        const linkMock = vi.fn().mockResolvedValue(undefined);
        const unlinkMock = vi.fn().mockResolvedValue(undefined);
        const executeMock = vi.fn().mockResolvedValue({ ...mockTask1, status: 'in_progress' });
        const cancelMock = vi.fn().mockResolvedValue(undefined);
        const createCommentMock = vi.fn().mockResolvedValue({} as TaskComment);

        const wrapper = createWrapper({
            task: {
                list: vi.fn().mockResolvedValue([mockTask1, mockTask2]),
                get: vi.fn().mockResolvedValue({ ...mockTask1, nextTask: null, previousTask: null } as TaskWithLinks),
                create: createMock,
                update: updateMock,
                close: closeMock,
                overrideStatus: overrideMock,
                link: linkMock,
                unlink: unlinkMock,
                execute: executeMock,
                cancel: cancelMock,
                createComment: createCommentMock,
                listComments: vi.fn().mockResolvedValue([]),
            },
        });

        const { result } = renderHook(() => useTaskPageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.allTasks).toHaveLength(2);
        });
        expect(result.current.selectedTaskId).toBeNull();

        act(() => {
            result.current.setSelectedTaskId(mockTask1.id);
        });

        // Create Task
        await act(async () => {
            await result.current.handleCreateTask({
                title: 'New',
                description: 'D',
                workspacePath: '/w',
            });
        });
        expect(createMock).toHaveBeenCalled();

        // Update Task
        await act(async () => {
            await result.current.handleUpdateTask({ title: 'Updated' });
        });
        expect(updateMock).toHaveBeenCalledWith(mockTask1.id, { title: 'Updated' });

        // Close Task
        await act(async () => {
            await result.current.handleCloseTask();
        });
        expect(closeMock).toHaveBeenCalledWith(mockTask1.id);

        // Override Status
        await act(async () => {
            await result.current.handleOverrideStatus('done');
        });
        expect(overrideMock).toHaveBeenCalledWith(mockTask1.id, 'done');

        // Link Task
        await act(async () => {
            await result.current.handleLinkTask(mockTask2.id);
        });
        expect(linkMock).toHaveBeenCalledWith(mockTask1.id, mockTask2.id);

        // Unlink Task
        await act(async () => {
            await result.current.handleUnlinkTask();
        });
        expect(unlinkMock).toHaveBeenCalledWith(mockTask1.id);

        // Execute Task
        await act(async () => {
            await result.current.handleExecuteTask();
        });
        expect(executeMock).toHaveBeenCalledWith(mockTask1.id);

        // Cancel Task
        await act(async () => {
            await result.current.handleCancelTask();
        });
        expect(cancelMock).toHaveBeenCalledWith(mockTask1.id);

        // Add Comment
        await act(async () => {
            await result.current.handleAddComment('Great progress!');
        });
        expect(createCommentMock).toHaveBeenCalledWith(mockTask1.id, {
            authorType: 'human',
            authorLabel: 'User',
            content: 'Great progress!',
        });
    });

    it('filters linkCandidates to exclude self, closed tasks, and tasks already linked to another predecessor', async () => {
        const taskA = { ...mockTask1, id: 'task-A', title: 'Task A', nextTaskId: 'task-C' };
        const taskB = { ...mockTask1, id: 'task-B', title: 'Task B', nextTaskId: null };
        const taskC = { ...mockTask1, id: 'task-C', title: 'Task C', nextTaskId: null }; // Already linked by taskA
        const taskD = { ...mockTask1, id: 'task-D', title: 'Task D', nextTaskId: null }; // Available
        const taskClosed = { ...mockTaskClosed, id: 'task-closed' }; // Closed

        const wrapper = createWrapper({
            task: {
                list: vi.fn().mockResolvedValue([taskA, taskB, taskC, taskD, taskClosed]),
                get: vi.fn().mockResolvedValue({ ...taskB, nextTask: null, previousTask: null }),
                listComments: vi.fn().mockResolvedValue([]),
            },
        });

        const { result } = renderHook(() => useTaskPageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.allTasks).toHaveLength(5);
        });

        // When no task selected, linkCandidates is empty
        expect(result.current.linkCandidates).toEqual([]);

        // Select Task B
        act(() => {
            result.current.setSelectedTaskId('task-B');
        });

        // Should include taskA (it doesn't have an upstream predecessor) and taskD.
        // Should exclude taskB (self), taskC (already pointed to by taskA.nextTaskId), and taskClosed (closed).
        const candidateIds = result.current.linkCandidates.map((t) => t.id);
        expect(candidateIds).toContain('task-A');
        expect(candidateIds).toContain('task-D');
        expect(candidateIds).not.toContain('task-B');
        expect(candidateIds).not.toContain('task-C');
        expect(candidateIds).not.toContain('task-closed');
    });
});
