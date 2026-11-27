import SkillsSettingsPage from '@/app/(main)/settings/skills/page';
import { StoreProvider } from '@/app/store-provider';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SkillManifest } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockSkill1: SkillManifest = {
    name: 'egm-bootstrap',
    description: 'Bootstrap codebase using Elephant-Goldfish Model architecture',
    path: '/users/test/.cosmo-studio/skills/egm-bootstrap',
    content: 'Follow these guidelines to bootstrap the EGM architecture...',
    isBuiltIn: false,
};

const mockSkill2: SkillManifest = {
    name: 'run-workflow',
    description: 'Dynamic Python workflow runner for orchestrating agent pipelines',
    path: '/users/test/.cosmo-studio/skills/system/run-workflow',
    content: 'Workflow orchestration system instructions...',
    isBuiltIn: true,
};

describe('SkillsSettingsPage', () => {
    it('renders discovered skills and distinguishes built-in vs custom skills', async () => {
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
        expect(screen.getByText('egm-bootstrap').closest('td')?.querySelector('svg')).toBeNull();
        expect(screen.getByText('Custom')).toBeInTheDocument();
        expect(screen.getByText('Built-in System')).toBeInTheDocument();
        expect(screen.queryByText('Centralized Skill Storage')).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /location/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/\.cosmo-studio\/skills/i)).not.toBeInTheDocument();
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
        expect(screen.queryByText(mockSkill1.path)).not.toBeInTheDocument();
    });

    it('opens upload dialog and uploads pasted skill markdown', async () => {
        let uploadedInput: unknown = null;
        const appDataSource = createMockAppDataSource({
            skill: {
                getAll: async () => [mockSkill1],
                upload: async (input) => {
                    uploadedInput = input;
                    return mockSkill1;
                },
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <SkillsSettingsPage />
            </StoreProvider>,
        );

        const uploadBtn = await screen.findByRole('button', { name: /upload skill/i });
        fireEvent.click(uploadBtn);

        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        // Switch to paste mode
        const pasteBtn = screen.getByRole('button', { name: /paste skill\.md/i });
        fireEvent.click(pasteBtn);

        const textarea = screen.getByLabelText(/skill\.md markdown content/i);
        fireEvent.change(textarea, { target: { value: '# My Custom Instructions' } });

        const submitBtn = screen.getByRole('button', { name: /upload & install/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(uploadedInput).toEqual({
                name: undefined,
                content: '# My Custom Instructions',
            });
        });
    });

    it('deletes a custom skill when confirmed', async () => {
        let deletedName: string | null = null;
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        const appDataSource = createMockAppDataSource({
            skill: {
                getAll: async () => [mockSkill1],
                delete: async (name) => {
                    deletedName = name;
                    return true;
                },
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <SkillsSettingsPage />
            </StoreProvider>,
        );

        const deleteBtn = await screen.findByRole('button', { name: /delete egm-bootstrap/i });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(deletedName).toBe('egm-bootstrap');
        });
    });
});
