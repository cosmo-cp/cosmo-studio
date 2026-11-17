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
});
