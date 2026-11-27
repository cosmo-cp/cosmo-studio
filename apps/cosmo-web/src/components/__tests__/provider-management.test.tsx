import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderManagement } from '../provider-management';

vi.mock('core/providerCatalog', async (importOriginal) => {
    const catalog = await importOriginal<typeof import('core/providerCatalog')>();
    return {
        ...catalog,
        ProviderCatalog: catalog.ProviderCatalog.map((provider) =>
            provider.name === 'OpenAI' ? { ...provider, hidden: true } : provider,
        ),
    };
});

vi.mock('@/features/providers/providers-api', () => ({
    useGetProvidersQuery: () => ({ data: [], isLoading: false, error: new Error('Provider service unavailable') }),
    useGetAvailableModelsForProviderMutation: () => [vi.fn()],
    useSaveProviderMutation: () => [vi.fn()],
    useDeleteProviderMutation: () => [vi.fn()],
}));

describe('ProviderManagement', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('hides marked providers from the picker, including search results', () => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        );
        render(<ProviderManagement />);
        fireEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

        expect(screen.queryByText('OpenAI', { exact: true })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Anthropic/ })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'OpenAI' } });
        expect(screen.getByText('No providers match your search.')).toBeInTheDocument();
    });

    it('shows a provider loading error without rendering the Error object or an empty state', () => {
        render(<ProviderManagement />);

        expect(screen.getByRole('alert')).toHaveTextContent('Provider service unavailable');
        expect(screen.queryByText('No providers added yet.')).not.toBeInTheDocument();
    });
});
