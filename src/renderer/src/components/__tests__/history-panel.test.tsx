import { HistoryPanel } from '@/components/history-panel';
import { HistoryPreviewItem } from '@/components/history-preview-item';
import { fireEvent, render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

// Keep the test data minimal so the shared panel contract is easy to verify.
function buildHistoryPanel() {
    const onCreate = vi.fn();
    const onSearch = vi.fn();
    const onSelect = vi.fn();

    render(
        <HistoryPanel
            action={{
                ariaLabel: 'Create item',
                icon: Plus,
                label: 'Create item',
                onClick: onCreate,
            }}
            getItemKey={(item) => item.id}
            items={[{ id: 'item-1', label: 'First item' }]}
            onSearch={onSearch}
            renderPreview={(item) => ({
                onSelect: () => onSelect(item.id),
                selected: false,
                summary: <p>Summary</p>,
                title: <span>{item.label}</span>,
            })}
            searchAriaLabel="Search items"
            searchPlaceholder="Search items..."
            title="Items"
        />,
    );

    return { onCreate, onSearch, onSelect };
}

describe('HistoryPanel', () => {
    it('renders the shared chrome and forwards search and action events', () => {
        const { onCreate, onSearch } = buildHistoryPanel();

        expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument();
        expect(screen.getByText('First item')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /create item/i }));
        fireEvent.change(screen.getByRole('textbox', { name: /search items/i }), {
            target: { value: 'first' },
        });

        expect(onCreate).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('first');
    });

    it('supports keyboard selection through the shared history row primitive', () => {
        const { onSelect } = buildHistoryPanel();
        const item = screen.getByRole('button', { name: /first item/i });

        fireEvent.keyDown(item, { key: 'Enter' });
        fireEvent.keyDown(item, { key: ' ' });

        expect(onSelect).toHaveBeenCalledTimes(2);
        expect(onSelect).toHaveBeenNthCalledWith(1, 'item-1');
        expect(onSelect).toHaveBeenNthCalledWith(2, 'item-1');
    });

    it('renders the shared preview layout with header and footer trailing content', () => {
        const onSelect = vi.fn();

        render(
            <HistoryPreviewItem
                footerTrailing={<span>pinned</span>}
                headerTrailing="10:30 AM"
                onSelect={onSelect}
                summary={<p>Summary text</p>}
                title={<h3>Preview title</h3>}
            />,
        );

        expect(screen.getByRole('button', { name: /preview title/i })).toBeInTheDocument();
        expect(screen.getByText('10:30 AM')).toBeInTheDocument();
        expect(screen.getByText('Summary text')).toBeInTheDocument();
        expect(screen.getByText('pinned')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /preview title/i }));

        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});
