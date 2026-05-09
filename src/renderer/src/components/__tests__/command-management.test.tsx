import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StoreProvider} from "@/lib/store/store-provider";
import {createMockAppDataSource} from "@/test/mock-app-data-source";
import {CommandManagement } from '../command-management';

vi.mock('electron-log/renderer', () => ({
    default: {
        scope: () => ({
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
        }),
    },
}));

describe('CommandManagement', () => {
    it('renders built-in commands from the API', async () => {
        const listAll = vi.fn().mockResolvedValue([
            {
                name: '/summarize',
                description: 'Summarize the chat.',
                template: 'Summarize the chat.',
                builtIn: true,
            },
        ]);

        render(
            <StoreProvider
                appDataSource={createMockAppDataSource({
                    command: {
                        listAll,
                    },
                })}
            >
                <CommandManagement/>
            </StoreProvider>
        );

        await waitFor(() => {
            expect(listAll).toHaveBeenCalled();
        });

        expect(screen.getByText('/summarize')).toBeInTheDocument();
        expect(screen.getByText('Summarize the chat.')).toBeInTheDocument();
    });
});
