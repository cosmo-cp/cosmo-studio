import { StoreProvider } from '@/app/store-provider';
import { GuardrailsManagement } from '@/components/guardrails-management';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GuardrailsConfigView } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockConfig: GuardrailsConfigView = {
    id: 'guardrails-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: null,
    enabled: true,
    injectionEnabled: true,
    injectionMode: 'heuristic',
    injectionThreshold: 0.7,
    leakageEnabled: true,
    leakageMode: 'heuristic',
    leakageThreshold: 0.7,
    piiEnabled: true,
    piiMode: 'redact',
    secretEnabled: true,
    secretMode: 'block',
};

function renderComponent(overrides = {}) {
    const dataSource = createMockAppDataSource({
        guardrails: {
            getConfig: vi.fn().mockResolvedValue(mockConfig),
            saveConfig: vi.fn().mockImplementation(async (input) => ({ ...mockConfig, ...input })),
            evaluate: vi.fn().mockResolvedValue({
                passed: true,
                blocked: false,
                redacted: false,
                violations: [],
                sanitizedText: 'Clean text',
                originalText: 'Clean text',
            }),
            ...overrides,
        },
    });

    return render(
        <StoreProvider appDataSource={dataSource}>
            <GuardrailsManagement />
        </StoreProvider>,
    );
}

describe('GuardrailsManagement Component', () => {
    it('renders the lean layout without top label, intro, or reset button', async () => {
        renderComponent();

        // Top label, intro, reset button, and save button should NOT be in the document
        expect(screen.queryByText('AI Guardrails & Security')).not.toBeInTheDocument();
        expect(screen.queryByText(/powered by/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        expect(screen.queryByText('Guardrails Playground & Verification')).not.toBeInTheDocument();

        // Core sections and rules should be present
        expect(screen.getByText('Master Guardrails Enforcement')).toBeInTheDocument();
        expect(screen.getByText('Security Guardrails')).toBeInTheDocument();
        expect(screen.getByText('Prompt Injection Defense')).toBeInTheDocument();
        expect(screen.getByText('Prompt Leakage Defense')).toBeInTheDocument();
        expect(screen.getByText('PII Privacy Protection')).toBeInTheDocument();
        expect(screen.getByText('Secret & Credential Shield')).toBeInTheDocument();

        // Individual Active/Disabled/Bypassed badges next to guardrail names should NOT be present
        expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
        expect(screen.queryByText('Bypassed')).not.toBeInTheDocument();
        expect(screen.queryAllByText('Active')).toHaveLength(0);
    });

    it('renders guardrails in a list layout with list items', async () => {
        renderComponent();

        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();

        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(4);
    });

    it('automatically saves changes when settings are modified', async () => {
        const saveMock = vi.fn().mockImplementation(async (input) => ({ ...mockConfig, ...input }));
        renderComponent({ saveConfig: saveMock });

        // Click Pattern button for Prompt Injection
        const patternButtons = screen.getAllByRole('button', { name: /Pattern \(Regex\)/i });
        fireEvent.click(patternButtons[0]);

        // Auto-save triggers immediately on button clicks
        await waitFor(() => {
            expect(saveMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    injectionMode: 'pattern',
                }),
            );
        });
    });

    it('automatically saves when a switch is toggled', async () => {
        const saveMock = vi.fn().mockImplementation(async (input) => ({ ...mockConfig, ...input }));
        renderComponent({ saveConfig: saveMock });

        const injectionSwitch = screen.getByRole('switch', { name: /Toggle Prompt Injection Defense/i });
        fireEvent.click(injectionSwitch);

        await waitFor(() => {
            expect(saveMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    injectionEnabled: false,
                }),
            );
        });
    });
});
