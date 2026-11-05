import { StoreProvider } from '@/app/store-provider';
import {
    useCancelTaskMutation,
    useCloseTaskMutation,
    useCreateTaskCommentMutation,
    useCreateTaskMutation,
    useExecuteTaskMutation,
    useGetTaskCommentsQuery,
    useGetTaskQuery,
    useGetTasksQuery,
    useLinkTasksMutation,
    useOverrideTaskStatusMutation,
    useUnlinkTaskMutation,
    useUpdateTaskMutation,
} from '@/features/tasks/tasks-api';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Task, TaskComment, TaskWithLinks } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockTask: Task = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Test Task',
    description: 'Instructions',
    workspacePath: '/workspace/dir',
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

const mockComment: TaskComment = {
    id: '22222222-2222-4222-8222-222222222222',
    taskId: mockTask.id,
    authorType: 'human',
    authorLabel: 'User',
    content: 'Test comment',
    metadata: null,
    createdAt: new Date('2026-01-01'),
};

function createWrapper(overrides = {}) {
    const dataSource = createMockAppDataSource(overrides);
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <StoreProvider appDataSource={dataSource}>{children}</StoreProvider>;
    };
}

describe('tasks-api hooks', () => {
    it('queries tasks list', async () => {
        const listMock = vi.fn().mockResolvedValue([mockTask]);
        const wrapper = createWrapper({
            task: { list: listMock },
        });

        const { result } = renderHook(() => useGetTasksQuery(), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toEqual([mockTask]);
        });
        expect(listMock).toHaveBeenCalled();
    });

    it('queries single task with links', async () => {
        const taskWithLinks: TaskWithLinks = {
            ...mockTask,
            nextTask: null,
            previousTask: null,
        };
        const getMock = vi.fn().mockResolvedValue(taskWithLinks);
        const wrapper = createWrapper({
            task: { get: getMock },
        });

        const { result } = renderHook(() => useGetTaskQuery(mockTask.id), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toEqual(taskWithLinks);
        });
        expect(getMock).toHaveBeenCalledWith(mockTask.id);
    });

    it('queries comments for a task', async () => {
        const listCommentsMock = vi.fn().mockResolvedValue([mockComment]);
        const wrapper = createWrapper({
            task: { listComments: listCommentsMock },
        });

        const { result } = renderHook(() => useGetTaskCommentsQuery(mockTask.id), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toEqual([mockComment]);
        });
        expect(listCommentsMock).toHaveBeenCalledWith(mockTask.id);
    });

    it('executes create task mutation', async () => {
        const createMock = vi.fn().mockResolvedValue(mockTask);
        const wrapper = createWrapper({
            task: { create: createMock },
        });

        const { result } = renderHook(() => useCreateTaskMutation(), { wrapper });
        const [create] = result.current;

        let res: unknown;
        await act(async () => {
            res = await create({
                title: 'New',
                description: 'Desc',
                workspacePath: '/w',
            });
        });

        expect(res).toEqual({ data: mockTask });
        expect(createMock).toHaveBeenCalled();
    });

    it('executes update task mutation', async () => {
        const updateMock = vi.fn().mockResolvedValue(mockTask);
        const wrapper = createWrapper({
            task: { update: updateMock },
        });

        const { result } = renderHook(() => useUpdateTaskMutation(), { wrapper });
        const [update] = result.current;

        let res: unknown;
        await act(async () => {
            res = await update({
                id: mockTask.id,
                updates: { title: 'Updated' },
            });
        });

        expect(res).toEqual({ data: mockTask });
        expect(updateMock).toHaveBeenCalledWith(mockTask.id, { title: 'Updated' });
    });

    it('executes close task mutation', async () => {
        const closeMock = vi.fn().mockResolvedValue({ ...mockTask, status: 'closed' });
        const wrapper = createWrapper({
            task: { close: closeMock },
        });

        const { result } = renderHook(() => useCloseTaskMutation(), { wrapper });
        const [close] = result.current;

        let res: unknown;
        await act(async () => {
            res = await close(mockTask.id);
        });
        expect(res).toEqual({ data: { ...mockTask, status: 'closed' } });
        expect(closeMock).toHaveBeenCalledWith(mockTask.id);
    });

    it('executes override status mutation', async () => {
        const overrideMock = vi.fn().mockResolvedValue({ ...mockTask, status: 'done' });
        const wrapper = createWrapper({
            task: { overrideStatus: overrideMock },
        });

        const { result } = renderHook(() => useOverrideTaskStatusMutation(), { wrapper });
        const [override] = result.current;

        let res: unknown;
        await act(async () => {
            res = await override({ id: mockTask.id, status: 'done' });
        });
        expect(res).toEqual({ data: { ...mockTask, status: 'done' } });
        expect(overrideMock).toHaveBeenCalledWith(mockTask.id, 'done');
    });

    it('executes link and unlink mutations', async () => {
        const linkMock = vi.fn().mockResolvedValue(undefined);
        const unlinkMock = vi.fn().mockResolvedValue(undefined);
        const wrapper = createWrapper({
            task: { link: linkMock, unlink: unlinkMock },
        });

        const { result: linkResult } = renderHook(() => useLinkTasksMutation(), { wrapper });
        const [link] = linkResult.current;
        await act(async () => {
            await link({ sourceTaskId: mockTask.id, targetTaskId: 'target-id' });
        });
        expect(linkMock).toHaveBeenCalledWith(mockTask.id, 'target-id');

        const { result: unlinkResult } = renderHook(() => useUnlinkTaskMutation(), { wrapper });
        const [unlink] = unlinkResult.current;
        await act(async () => {
            await unlink(mockTask.id);
        });
        expect(unlinkMock).toHaveBeenCalledWith(mockTask.id);
    });

    it('executes execute and cancel mutations', async () => {
        const executeMock = vi.fn().mockResolvedValue({ ...mockTask, status: 'in_progress' });
        const cancelMock = vi.fn().mockResolvedValue(undefined);
        const wrapper = createWrapper({
            task: { execute: executeMock, cancel: cancelMock },
        });

        const { result: execResult } = renderHook(() => useExecuteTaskMutation(), { wrapper });
        const [execute] = execResult.current;
        let res: unknown;
        await act(async () => {
            res = await execute(mockTask.id);
        });
        expect(res).toEqual({ data: { ...mockTask, status: 'in_progress' } });
        expect(executeMock).toHaveBeenCalledWith(mockTask.id);

        const { result: cancelResult } = renderHook(() => useCancelTaskMutation(), { wrapper });
        const [cancel] = cancelResult.current;
        await act(async () => {
            await cancel(mockTask.id);
        });
        expect(cancelMock).toHaveBeenCalledWith(mockTask.id);
    });

    it('executes createComment mutation', async () => {
        const createCommentMock = vi.fn().mockResolvedValue(mockComment);
        const wrapper = createWrapper({
            task: { createComment: createCommentMock },
        });

        const { result } = renderHook(() => useCreateTaskCommentMutation(), { wrapper });
        const [createComment] = result.current;
        let res: unknown;
        await act(async () => {
            res = await createComment({
                taskId: mockTask.id,
                input: { authorType: 'human', authorLabel: 'User', content: 'Test' },
            });
        });
        expect(res).toEqual({ data: mockComment });
        expect(createCommentMock).toHaveBeenCalledWith(mockTask.id, {
            authorType: 'human',
            authorLabel: 'User',
            content: 'Test',
        });
    });
});
