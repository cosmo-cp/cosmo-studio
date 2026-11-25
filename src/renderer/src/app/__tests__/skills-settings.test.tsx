import SkillsSettingsPage from '@/app/(main)/settings/skills/page';
import { StoreProvider } from '@/app/store-provider';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SkillManifest } from 'core/dto';
import React from 'react';
import { describe, expect, it } from 'vitest';

const mockSkill1: SkillManifest = {
    name: 'egm-bootstrap',
    description: 'Bootstrap codebase using Elephant-Goldfish Model architecture',
    path: '/repos/cosmocp-desktop/skills/egm-bootstrap',
    content: 'Follow these guidelines to bootstrap the EGM architecture...',
    isBuiltIn: false,
};

const mockSkill2: SkillManifest = {
    name: 'run-workflow',
    description: 'Dynamic Python workflow runner for orchestrating agent pipelines',
    path: '/repos/cosmocp-desktop/skills/system/run-workflow',
    content: 'Workflow orchestration system instructions...',
    isBuiltIn: true,
};

describe('SkillsSettingsPage', () => {
    it('renders discovered skills and distinguishes built-in vs workspace skills', async () => {
        const appDataSource = createMockAppDataSource({
            skill: {
                getAll: async () => [mockSkill1, mockSkill2],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <SkillsSettingsPage />
            </StoreProvider>,
        );

        expect(await screen.findByText('egm-bootstrap')).toBeInTheDocument();
        expect(screen.getByText('run-workflow')).toBeInTheDocument();
        expect(screen.getByText('Workspace')).toBeInTheDocument();
        expect(screen.getByText('Built-in System')).toBeInTheDocument();
    });

    it('opens inspect manifest dialog showing injected instructions', async () => {
        const appDataSource = createMockAppDataSource({
            skill: {
                getAll: async () => [mockSkill1],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <SkillsSettingsPage />
            </StoreProvider>,
        );

        const inspectBtn = await screen.findByRole('button', { name: /inspect manifest/i });
        fireEvent.click(inspectBtn);

        expect(await screen.findByText('Injected Instructions (SKILL.md)')).toBeInTheDocument();
        expect(screen.getByText(/Follow these guidelines to bootstrap the EGM architecture/i)).toBeInTheDocument();
    });
});
