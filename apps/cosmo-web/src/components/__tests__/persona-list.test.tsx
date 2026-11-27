import { StoreProvider } from '@/app/store-provider';
import { PersonaList } from '@/components/persona-list';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Persona, SkillManifest } from 'core/dto';
import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

const mockPersona: Persona = {
    id: '11111111-1111-4111-8111-111111111111',
    organizationId: null,
    userId: null,
    name: 'EGM Architect',
    role: 'Lead Architect',
    description: 'Expert in Elephant-Goldfish Model',
    details: 'System prompt instructions',
    systemPrompt: 'System prompt instructions',
    avatarUrl: null,
    modelIdentifier: 'anthropic:claude-3-7-sonnet',
    temperature: 0.2,
    reasoningEffort: 'high',
    skills: ['egm-bootstrap'],
    toolAccessMode: 'custom',
    allowedMcpServers: [],
    allowedTools: [],
    webSearchEnabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockSkill: SkillManifest = {
    name: 'egm-bootstrap',
    description: 'Bootstrap codebase with EGM architecture',
    path: '/repos/cosmocp-desktop/skills/egm-bootstrap',
    isBuiltIn: false,
};

beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});

describe('PersonaList component', () => {
    it('renders persona list with role, model, and skill badges', async () => {
        const appDataSource = createMockAppDataSource({
            persona: {
                getAll: async () => [mockPersona],
            },
            skill: {
                getAll: async () => [mockSkill],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <PersonaList />
            </StoreProvider>,
        );

        expect(await screen.findByText('EGM Architect')).toBeInTheDocument();
        expect(screen.getByText('Lead Architect')).toBeInTheDocument();
        expect(screen.getByText('anthropic:claude-3-7-sonnet')).toBeInTheDocument();
        expect(screen.getByText('egm-bootstrap')).toBeInTheDocument();
        expect(screen.getByText('Custom tools')).toBeInTheDocument();
    });

    it('opens dialog with Identity, Intelligence, Skills, and Tools tabs', async () => {
        const appDataSource = createMockAppDataSource({
            persona: {
                getAll: async () => [mockPersona],
            },
            skill: {
                getAll: async () => [mockSkill],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <PersonaList />
            </StoreProvider>,
        );

        const addBtn = await screen.findByRole('button', { name: /add persona/i });
        fireEvent.click(addBtn);

        expect(screen.getByRole('tab', { name: /identity/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /intelligence/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /skills/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /tools/i })).toBeInTheDocument();

        // Switch to Intelligence tab
        const intelligenceTab = screen.getByRole('tab', { name: /intelligence/i });
        fireEvent.pointerDown(intelligenceTab, { button: 0, ctrlKey: false });
        fireEvent.keyDown(intelligenceTab, { key: 'Enter' });
        fireEvent.click(intelligenceTab);
        expect(await screen.findByText(/temperature/i)).toBeInTheDocument();
        expect(screen.getByText(/reasoning effort/i)).toBeInTheDocument();

        // Switch to Skills tab
        const skillsTab = screen.getByRole('tab', { name: /skills/i });
        fireEvent.pointerDown(skillsTab, { button: 0, ctrlKey: false });
        fireEvent.keyDown(skillsTab, { key: 'Enter' });
        fireEvent.click(skillsTab);
        expect(await screen.findByText('Specialized Agent Skills')).toBeInTheDocument();

        // Switch to Tools tab
        const toolsTab = screen.getByRole('tab', { name: /tools/i });
        fireEvent.pointerDown(toolsTab, { button: 0, ctrlKey: false });
        fireEvent.keyDown(toolsTab, { key: 'Enter' });
        fireEvent.click(toolsTab);
        expect(await screen.findByText('Tool Access Mode')).toBeInTheDocument();
        expect(screen.getByText('Exa Web Search')).toBeInTheDocument();
    });
});
