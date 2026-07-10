import { isRejected, type Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { logger } from '../../logger';

const TOAST_BY_REJECTED_ACTION: Record<string, string> = {
    'chat/loadChats/rejected': 'Failed to load chats',
    'chat/loadMessages/rejected': 'Failed to load chat messages',
    'chat/createChat/rejected': 'Failed to create chat',
    'chat/selectChat/rejected': 'Failed to select chat',
    'chat/deleteChat/rejected': 'Failed to delete chat',
    'chat/togglePinned/rejected': 'Failed to update chat pin status',
    'chat/sendMessage/rejected': 'Failed to send message',
    'chat/regenerate/rejected': 'Failed to regenerate response',
    'chat/approveTool/rejected': 'Failed to respond to tool approval',
    'chat/stopChat/rejected': 'Failed to stop response',
    'chat/syncMessages/rejected': 'Failed to sync chat messages',
};

export const logIpcError = (operation: string, error: unknown): void => {
    logger.error(operation, error);
};

export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unexpected error occurred.';
};

export const chatErrorMiddleware: Middleware = () => (next) => (action) => {
    const result = next(action);
    if (!isRejected(action)) {
        return result;
    }

    const toastTitle = TOAST_BY_REJECTED_ACTION[action.type];
    if (!toastTitle) {
        return result;
    }

    const description = action.error.message;
    toast.error(toastTitle, description ? { description } : undefined);
    return result;
};
