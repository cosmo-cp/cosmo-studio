import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProviderManagement } from '../provider-management';

vi.mock('@/features/providers/providers-api', () => ({
    useGetProvidersQuery: () => ({ data: [], isLoading: false, error: new Error('Provider service unavailable') }),
    useGetAvailableModelsForProviderMutation: () => [vi.fn()],
    useSaveProviderMutation: () => [vi.fn()],
    useDeleteProviderMutation: () => [vi.fn()],
}));

describe('ProviderManagement', () => {
    it('shows a provider loading error without rendering the Error object or an empty state', () => {
        render(<ProviderManagement />);

        expect(screen.getByRole('alert')).toHaveTextContent('Provider service unavailable');
        expect(screen.queryByText('No providers added yet.')).not.toBeInTheDocument();
    });
});
