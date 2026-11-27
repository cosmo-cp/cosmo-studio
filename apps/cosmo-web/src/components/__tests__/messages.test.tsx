import { StoreProvider } from '@/app/store-provider';
import { Messages } from '@/components/messages';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen } from '@testing-library/react';
import type { UIMessage } from 'ai';
import { describe, expect, it, vi } from 'vitest';

class ResizeObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}
}

describe('Messages', () => {
    it('bounds the conversation and exposes a scrollable viewport', async () => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);

        render(
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <div className="h-96">
                    <Messages chatId="chat-1" messages={[] as UIMessage[]} status="ready" />
                </div>
            </StoreProvider>,
        );

        const conversation = screen.getByRole('log').closest('[data-slot="message-scroller"]');
        if (!conversation) throw new Error('Message scroller is missing');
        expect(conversation).toHaveClass('h-full', 'min-h-0');
        expect(conversation.querySelector('.overflow-y-auto')).not.toBeNull();
        expect(await screen.findByText('Start a conversation')).toBeInTheDocument();
    });

    it('keeps new user messages in the bottom-following flow while responses stream', async () => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
        const user: UIMessage = { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] };
        const view = (messages: UIMessage[], status: 'submitted' | 'streaming') => (
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <Messages chatId="chat-1" messages={messages} status={status} />
            </StoreProvider>
        );
        const { rerender } = render(view([], 'submitted'));
        rerender(view([user], 'submitted'));
        const item = (await screen.findByText('Hello')).closest('[data-message-id]');
        expect(item).toHaveAttribute('data-scroll-anchor', 'false');
        rerender(
            view(
                [user, { id: 'assistant-1', role: 'assistant', parts: [{ type: 'text', text: 'Response' }] }],
                'streaming',
            ),
        );
        expect(await screen.findByText('Response')).toBeInTheDocument();
        expect(item).toHaveAttribute('data-scroll-anchor', 'false');
    });

    it('shows a tool approval request and sends the selected response', async () => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
        const respond = vi.fn();
        const messages = [
            {
                id: 'message-1',
                role: 'assistant',
                parts: [
                    {
                        type: 'dynamic-tool',
                        toolCallId: 'call-1',
                        toolName: 'readFile',
                        state: 'approval-requested',
                        input: { path: 'file.txt' },
                        approval: { id: 'approval-1' },
                    },
                ],
            },
        ] as UIMessage[];
        render(
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <Messages chatId="chat-1" messages={messages} status="ready" addToolApprovalResponse={respond} />
            </StoreProvider>,
        );
        expect(await screen.findByText('This tool requires your approval to run.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
        expect(respond).toHaveBeenCalledWith({ id: 'approval-1', approved: false, reason: 'User denied tool call' });
        fireEvent.click(screen.getByRole('button', { name: 'Allow' }));
        expect(respond).toHaveBeenCalledWith({ id: 'approval-1', approved: true });
    });
    it('closes finished tool calls and lets readers reopen them', async () => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
        const message = (state: string) =>
            [
                {
                    id: 'message-1',
                    role: 'assistant',
                    parts: [
                        {
                            type: 'dynamic-tool',
                            toolCallId: 'call-1',
                            toolName: 'readFile',
                            state,
                            input: { path: 'file.txt' },
                            output: 'contents',
                        },
                    ],
                },
            ] as UIMessage[];
        const view = (state: string) => (
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <Messages chatId="chat-1" messages={message(state)} status="ready" />
            </StoreProvider>
        );
        const { rerender } = render(view('input-available'));
        const trigger = await screen.findByRole('button', { name: /readFile.*Running/ });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        rerender(view('output-available'));
        const completed = screen.getByRole('button', { name: /readFile.*Completed/ });
        expect(completed).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(completed);
        expect(completed).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('contents')).toBeInTheDocument();
    });
});
