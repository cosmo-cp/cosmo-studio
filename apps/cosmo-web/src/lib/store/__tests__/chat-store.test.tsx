import { applyChatDefaults, createInitialChatState, type ChatState } from '@/features/chat/chat-store';
import { WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import { describe, expect, it } from 'vitest';

function createState(overrides: Partial<ChatState> = {}): ChatState {
    return {
        selectedChatId: null,
        searchHistoryQuery: null,
        searchQuery: '',
        currentMatchIndex: 0,
        totalMatches: 0,
        selectedWebSearchOptionByChatId: {},
        ...overrides,
    };
}

describe('chat store', () => {
    it('initializes missing chat web-search selections with the default option', () => {
        const initialState = createState();

        expect(applyChatDefaults(initialState.selectedWebSearchOptionByChatId, ['chat-1', 'chat-2'])).toEqual({
            'chat-1': WEB_SEARCH_NONE_OPTION_ID,
            'chat-2': WEB_SEARCH_NONE_OPTION_ID,
        });
    });

    it('returns the same state when chat defaults are already present', () => {
        const initialState = {
            ...createInitialChatState(),
            selectedWebSearchOptionByChatId: {
                'chat-1': WEB_SEARCH_NONE_OPTION_ID,
            },
        };

        const nextState = applyChatDefaults(initialState.selectedWebSearchOptionByChatId, ['chat-1']);

        expect(nextState).toBe(initialState.selectedWebSearchOptionByChatId);
    });

    it('drops stale chat selections that are no longer in the history list', () => {
        const initialState = createState({
            selectedWebSearchOptionByChatId: {
                'chat-1': WEB_SEARCH_NONE_OPTION_ID,
                'chat-2': 'parallel',
            },
        });

        expect(applyChatDefaults(initialState.selectedWebSearchOptionByChatId, ['chat-2'])).toEqual({
            'chat-2': 'parallel',
        });
    });
});
