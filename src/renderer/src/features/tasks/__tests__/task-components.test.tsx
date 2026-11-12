import { StoreProvider } from '@/app/store-provider';
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { LinkTaskDialog } from '@/features/tasks/components/link-task-dialog';
import { TaskComments } from '@/features/tasks/components/task-comments';
import { TaskDetail } from '@/features/tasks/components/task-detail';
import { TaskLinkCard } from '@/features/tasks/components/task-link-card';
import { TaskList } from '@/features/tasks/components/task-list';
import { TaskStatusBadge } from '@/features/tasks/components/task-status-badge';
import { TasksView } from '@/features/tasks/components/tasks-view';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from 'core/database/schema/acpAgentSchema';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import type { AcpAgentView, ProviderWithModels, Task, TaskComment, TaskWithLinks } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockTaskA: Task = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Task Alpha',
    description: 'Implement alpha logic',
    workspacePath: '/path/to/project-a',
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

const mockTaskB: Task = {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Task Beta',
    description: 'Implement beta logic',
    workspacePath: '/path/to/project-b',
    workspaceId: null,
    runtime: 'agent',
    provider: null,
    modelId: null,
    agentId: '33333333-3333-4333-8333-333333333333',
    status: 'in_progress',
    nextTaskId: null,
    closedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockComment: TaskComment = {
    id: 'c1',
    taskId: mockTaskA.id,
    authorType: 'human',
    authorLabel: 'Alice',
    content: 'Please make sure tests pass.',
    metadata: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
};

const mockAgentComment: TaskComment = {
    id: 'c2',
    taskId: mockTaskA.id,
    authorType: 'agent',
    authorLabel: 'Copilot ACP',
    content: 'Finished executing tool call.',
    metadata: null,
    createdAt: new Date('2026-01-01T10:05:00Z'),
};

const mockSystemComment: TaskComment = {
    id: 'c3',
    taskId: mockTaskA.id,
    authorType: 'system',
    authorLabel: 'Cosmo System',
    content: 'Execution interrupted.',
    metadata: null,
    createdAt: new Date('2026-01-01T10:10:00Z'),
};

describe('TaskStatusBadge', () => {
    it('renders correct labels for all statuses', () => {
        const { rerender } = render(<TaskStatusBadge status="not_started" />);
        expect(screen.getByText('Not Started')).toBeInTheDocument();

        rerender(<TaskStatusBadge status="in_progress" />);
        expect(screen.getByText('In Progress')).toBeInTheDocument();

        rerender(<TaskStatusBadge status="done" />);
        expect(screen.getByText('Done')).toBeInTheDocument();

        rerender(<TaskStatusBadge status="failed" />);
        expect(screen.getByText('Failed')).toBeInTheDocument();

        rerender(<TaskStatusBadge status="cancelled" />);
        expect(screen.getByText('Cancelled')).toBeInTheDocument();

        rerender(<TaskStatusBadge status="closed" />);
        expect(screen.getByText('Closed')).toBeInTheDocument();
    });
});

describe('TaskList', () => {
    it('renders tasks, triggers search, and handles task selection', () => {
        const onSelectTask = vi.fn();
        const onSearchChange = vi.fn();
        const onStatusFilterChange = vi.fn();
        const onOpenCreateDialog = vi.fn();

        render(
            <TaskList
                tasks={[mockTaskA, mockTaskB]}
                selectedTaskId={mockTaskA.id}
                searchQuery=""
                statusFilter="all"
                onSearchChange={onSearchChange}
                onStatusFilterChange={onStatusFilterChange}
                onSelectTask={onSelectTask}
                onOpenCreateDialog={onOpenCreateDialog}
            />,
        );

        expect(screen.getByText('Task Alpha')).toBeInTheDocument();
        expect(screen.getByText('Task Beta')).toBeInTheDocument();

        // Click create button
        fireEvent.click(screen.getByTestId('create-task-btn'));
        expect(onOpenCreateDialog).toHaveBeenCalled();

        // Select second task
        fireEvent.click(screen.getByTestId(`task-item-${mockTaskB.id}`));
        expect(onSelectTask).toHaveBeenCalledWith(mockTaskB.id);

        // Change search input
        const searchInput = screen.getByTestId('task-search-input');
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });
        expect(onSearchChange).toHaveBeenCalledWith('Alpha');

        // Click status filter
        fireEvent.click(screen.getByTestId('filter-active'));
        expect(onStatusFilterChange).toHaveBeenCalledWith('active');
    });

    it('displays empty message when no tasks match', () => {
        render(
            <TaskList
                tasks={[]}
                selectedTaskId={null}
                searchQuery="nomatch"
                statusFilter="all"
                onSearchChange={vi.fn()}
                onStatusFilterChange={vi.fn()}
                onSelectTask={vi.fn()}
                onOpenCreateDialog={vi.fn()}
            />,
        );

        expect(screen.getByText('No tasks found matching your criteria.')).toBeInTheDocument();
    });
});

describe('TaskDetail', () => {
    it('renders empty placeholder when task is undefined', () => {
        render(
            <TaskDetail
                task={undefined}
                comments={[]}
                onExecute={vi.fn()}
                onCancel={vi.fn()}
                onClose={vi.fn()}
                onOverrideStatus={vi.fn()}
                onSelectTask={vi.fn()}
                onOpenLinkDialog={vi.fn()}
                onUnlinkTask={vi.fn()}
                onAddComment={vi.fn()}
            />,
        );

        expect(screen.getByText('No Task Selected')).toBeInTheDocument();
    });

    it('renders task details, actions, and responds to click events', async () => {
        const onExecute = vi.fn();
        const onClose = vi.fn();

        render(
            <TaskDetail
                task={{ ...mockTaskA, nextTask: null, previousTask: null }}
                comments={[mockComment]}
                onExecute={onExecute}
                onCancel={vi.fn()}
                onClose={onClose}
                onOverrideStatus={vi.fn()}
                onSelectTask={vi.fn()}
                onOpenLinkDialog={vi.fn()}
                onUnlinkTask={vi.fn()}
                onAddComment={vi.fn()}
            />,
        );

        expect(screen.getByText('Task Alpha')).toBeInTheDocument();
        expect(screen.getByText('Implement alpha logic')).toBeInTheDocument();

        // Run task
        const runBtn = screen.getByTestId('execute-task-btn');
        fireEvent.click(runBtn);
        expect(onExecute).toHaveBeenCalled();

        // Close task
        const closeBtn = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('renders cancel button when task is in progress', () => {
        const onCancel = vi.fn();
        render(
            <TaskDetail
                task={{ ...mockTaskB, nextTask: null, previousTask: null }}
                comments={[]}
                onExecute={vi.fn()}
                onCancel={onCancel}
                onClose={vi.fn()}
                onOverrideStatus={vi.fn()}
                onSelectTask={vi.fn()}
                onOpenLinkDialog={vi.fn()}
                onUnlinkTask={vi.fn()}
                onAddComment={vi.fn()}
            />,
        );

        const cancelBtn = screen.getByTestId('cancel-task-btn');
        expect(cancelBtn).toBeInTheDocument();
        fireEvent.click(cancelBtn);
        expect(onCancel).toHaveBeenCalled();
    });
});

describe('TaskLinkCard', () => {
    it('renders linked downstream task and upstream predecessor', () => {
        const taskWithLinks: TaskWithLinks = {
            ...mockTaskA,
            nextTask: mockTaskB,
            previousTask: {
                id: '00000000-0000-0000-0000-000000000000',
                title: 'Upstream Task',
                description: 'Upstream desc',
                status: 'done',
                workspacePath: '/w0',
                workspaceId: null,
                runtime: 'model',
                provider: null,
                modelId: null,
                agentId: null,
                nextTaskId: mockTaskA.id,
                closedAt: null,
                createdAt: new Date('2026-01-01'),
                updatedAt: new Date('2026-01-01'),
            },
        };

        const onSelectTask = vi.fn();
        const onUnlinkTask = vi.fn();

        render(
            <TaskLinkCard
                task={taskWithLinks}
                onSelectTask={onSelectTask}
                onOpenLinkDialog={vi.fn()}
                onUnlinkTask={onUnlinkTask}
            />,
        );

        expect(screen.getByText('Upstream predecessor:')).toBeInTheDocument();
        expect(screen.getByText('Upstream Task')).toBeInTheDocument();
        expect(screen.getByText('Task Beta')).toBeInTheDocument();

        // Click view task
        fireEvent.click(screen.getByRole('button', { name: /view task/i }));
        expect(onSelectTask).toHaveBeenCalledWith(mockTaskB.id);

        // Click unlink
        fireEvent.click(screen.getByTitle('Unlink follow-up task'));
        expect(onUnlinkTask).toHaveBeenCalled();
    });

    it('renders empty slot with link button when no next task', () => {
        const onOpenLinkDialog = vi.fn();
        render(
            <TaskLinkCard
                task={{ ...mockTaskA, nextTask: null, previousTask: null }}
                onSelectTask={vi.fn()}
                onOpenLinkDialog={onOpenLinkDialog}
                onUnlinkTask={vi.fn()}
            />,
        );

        expect(screen.getByText(/no follow-up task linked/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /link next task/i }));
        expect(onOpenLinkDialog).toHaveBeenCalled();
    });

    it('allows linking and unlinking even when task is in_progress', () => {
        const onOpenLinkDialog = vi.fn();
        const onUnlinkTask = vi.fn();

        const { rerender } = render(
            <TaskLinkCard
                task={{ ...mockTaskB, nextTask: null, previousTask: null }}
                onSelectTask={vi.fn()}
                onOpenLinkDialog={onOpenLinkDialog}
                onUnlinkTask={onUnlinkTask}
            />,
        );

        const linkBtn = screen.getByRole('button', { name: /link next task/i });
        expect(linkBtn).not.toBeDisabled();
        fireEvent.click(linkBtn);
        expect(onOpenLinkDialog).toHaveBeenCalled();

        rerender(
            <TaskLinkCard
                task={{ ...mockTaskB, nextTask: mockTaskA, previousTask: null }}
                onSelectTask={vi.fn()}
                onOpenLinkDialog={onOpenLinkDialog}
                onUnlinkTask={onUnlinkTask}
            />,
        );

        const unlinkBtn = screen.getByTitle('Unlink follow-up task');
        expect(unlinkBtn).not.toBeDisabled();
        fireEvent.click(unlinkBtn);
        expect(onUnlinkTask).toHaveBeenCalled();
    });
});

describe('TaskComments', () => {
    it('renders comments stream with human, agent, and system labels', () => {
        render(<TaskComments comments={[mockComment, mockAgentComment, mockSystemComment]} onAddComment={vi.fn()} />);

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Please make sure tests pass.')).toBeInTheDocument();
        expect(screen.getByText('Copilot ACP')).toBeInTheDocument();
        expect(screen.getByText('Agent Report')).toBeInTheDocument();
        expect(screen.getByText('Cosmo System')).toBeInTheDocument();
        expect(screen.getByText('Execution interrupted.')).toBeInTheDocument();
    });

    it('submits a new comment', async () => {
        const onAddComment = vi.fn().mockResolvedValue(undefined);
        render(<TaskComments comments={[]} onAddComment={onAddComment} />);

        const input = screen.getByPlaceholderText(/add human instruction/i);
        fireEvent.change(input, { target: { value: 'New review note' } });

        const postBtn = screen.getByRole('button', { name: /post comment/i });
        fireEvent.click(postBtn);

        expect(onAddComment).toHaveBeenCalledWith('New review note');
    });
});

describe('CreateTaskDialog', () => {
    const mockProvider: ProviderWithModels = {
        id: 'p1',
        name: 'openai',
        type: ModelProviderTypeEnum.OPENAI,
        apiUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        models: [
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                modelId: 'gpt-4o',
                description: null,
                reasoning: false,
                attachment: false,
                toolCall: true,
                status: null,
                inputModalities: [],
                outputModalities: [],
                releaseDate: null,
                lastUpdatedByProvider: null,
                contextWindow: 128000,
                maxOutputWindow: 4096,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
    };

    const mockAgent: AcpAgentView = {
        id: 'a1',
        name: 'Agent ACP',
        command: 'npx agent',
        source: AcpAgentSourceEnum.CUSTOM,
        installStatus: AcpAgentInstallStatusEnum.INSTALLED,
        description: 'Test agent',
        registryId: null,
        version: null,
        defaultCwd: null,
        defaultWorkspaceId: null,
        authMethodId: null,
        enabled: true,
        args: [],
        envKeys: [],
        mcpServerIds: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    it('fills form and calls onSubmit', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <CreateTaskDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    onSubmit={onSubmit}
                    providers={[mockProvider]}
                    agents={[mockAgent]}
                />
            </StoreProvider>,
        );

        fireEvent.change(screen.getByTestId('task-title-input'), {
            target: { value: 'Created Task' },
        });
        fireEvent.change(screen.getByTestId('task-workspace-input'), {
            target: { value: '/tmp/workspace' },
        });
        fireEvent.change(screen.getByTestId('task-description-input'), {
            target: { value: 'Instructions here' },
        });

        fireEvent.click(screen.getByTestId('submit-create-task'));

        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Created Task',
                workspacePath: '/tmp/workspace',
                description: 'Instructions here',
                runtime: 'model',
            }),
        );
    });

    it('selects workspace from WorkspaceSelector and submits workspaceId', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const mockWorkspace = {
            id: 'ws-test-123',
            name: 'Repo Workspace',
            canonicalPath: '/canonical/repo',
            rawPath: '/canonical/repo',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        render(
            <StoreProvider
                appDataSource={createMockAppDataSource({
                    workspace: {
                        list: async () => [mockWorkspace],
                    },
                })}
            >
                <CreateTaskDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    onSubmit={onSubmit}
                    providers={[mockProvider]}
                    agents={[mockAgent]}
                />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /select registered workspace/i })).toBeInTheDocument();
        });

        fireEvent.change(screen.getByTestId('task-title-input'), {
            target: { value: 'Workspace Task' },
        });
        fireEvent.change(screen.getByTestId('task-description-input'), {
            target: { value: 'Do work in workspace' },
        });

        // Trigger workspace input matching after query resolves
        await waitFor(() => {
            fireEvent.change(screen.getByTestId('task-workspace-input'), {
                target: { value: '/canonical/repo' },
            });
            expect(screen.getByTestId('task-workspace-input')).toHaveValue('/canonical/repo');
        });

        fireEvent.click(screen.getByTestId('submit-create-task'));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Workspace Task',
                    workspacePath: '/canonical/repo',
                    workspaceId: 'ws-test-123',
                }),
            );
        });
    });
});

describe('LinkTaskDialog', () => {
    it('renders candidate options and links task on submit', () => {
        const onLink = vi.fn();
        render(<LinkTaskDialog open={true} onOpenChange={vi.fn()} candidates={[mockTaskB]} onLink={onLink} />);

        expect(screen.getByText('Link Follow-up Task')).toBeInTheDocument();
        expect(screen.getByText('Choose a task to execute next...')).toBeInTheDocument();
    });
});

describe('TasksView integration', () => {
    it('renders tasks page and lists tasks from data source', async () => {
        const dataSource = createMockAppDataSource({
            task: {
                list: vi.fn().mockResolvedValue([mockTaskA]),
                get: vi.fn().mockResolvedValue({ ...mockTaskA, nextTask: null, previousTask: null }),
                listComments: vi.fn().mockResolvedValue([mockComment]),
            },
        });

        render(
            <StoreProvider appDataSource={dataSource}>
                <TasksView />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument();
            expect(screen.getByText('Task Alpha')).toBeInTheDocument();
        });

        expect(screen.queryByText('Instructions & Acceptance Criteria')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`task-item-${mockTaskA.id}`));

        await waitFor(() => {
            expect(screen.getByText('Instructions & Acceptance Criteria')).toBeInTheDocument();
        });
    });
});
