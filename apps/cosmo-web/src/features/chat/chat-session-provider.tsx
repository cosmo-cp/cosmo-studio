'use client';

import { ChatSessionRegistry } from '@/features/chat/chat-session-registry';
import { useAppDataSource } from '@/lib/store/hooks';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSWRConfig } from 'swr';

const Context = createContext<ChatSessionRegistry | null>(null);

// Own chat streams for the lifetime of the renderer rather than the chat page.
export function ChatSessionProvider({ children }: { children: ReactNode }) {
    const backend = useAppDataSource();
    const { mutate } = useSWRConfig();
    const [registry] = useState(
        () =>
            new ChatSessionRegistry(backend, () => {
                void mutate((key) => Array.isArray(key) && key[0] === 'chat' && key[1] === 'history');
            }),
    );
    const disposal = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (disposal.current) clearTimeout(disposal.current);
        return () => {
            disposal.current = setTimeout(() => registry.dispose(), 0);
        };
    }, [registry]);
    return <Context.Provider value={registry}>{children}</Context.Provider>;
}

export function useChatSessions() {
    const registry = useContext(Context);
    if (!registry) throw new Error('ChatSessionProvider is missing');
    return registry;
}
