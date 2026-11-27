import { StoreProvider } from '@/app/store-provider';
import { usePersonaPageState } from '@/features/personas/use-persona-page-state';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { NewPersona, Persona } from 'core/dto';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPersona1: Persona = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Lead Architect',
    role: 'Staff Architect',
    description: 'Designs systems',
    details: 'System prompt instructions',
    systemPrompt: 'System prompt instructions',
    avatarUrl: null,
    modelIdentifier: 'anthropic:claude-3-7-sonnet',
    temperature: 0.2,
    reasoningEffort: 'high',
    skills: ['egm-bootstrap'],
    toolAccessMode: 'custom',
    allowedMcpServers: ['srv-1'],
    allowedTools: ['whitelisted_tool'],
    webSearchEnabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

describe('usePersonaPageState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and lists personas', async () => {
        const appDataSource = createMockAppDataSource({
            persona: {
                getAll: async () => [mockPersona1],
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => usePersonaPageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.personas).toHaveLength(1);
            expect(result.current.personas[0].name).toBe('Lead Architect');
            expect(result.current.personas[0].skills).toEqual(['egm-bootstrap']);
            expect(result.current.personas[0].modelIdentifier).toBe('anthropic:claude-3-7-sonnet');
        });
    });

    it('opens create dialog with defaults and allows saving rich persona', async () => {
        let createdInput: NewPersona | null = null;
        const appDataSource = createMockAppDataSource({
            persona: {
                getAll: async () => [],
                create: async (input) => {
                    createdInput = input as NewPersona;
                    return {
                        id: '22222222-2222-4222-8222-222222222222',
                        ...input,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as Persona;
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => usePersonaPageState(), { wrapper });

        act(() => {
            result.current.openCreateDialog();
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.name).toBe('');
        expect(result.current.temperature).toBe(0.7);
        expect(result.current.toolAccessMode).toBe('all');

        act(() => {
            result.current.setName('Security Auditor');
            result.current.setRole('AppSec Lead');
            result.current.setDescription('Audits code for vulnerabilities');
            result.current.setSystemPrompt('Analyze code for OWASP top 10 vulnerabilities.');
            result.current.setModelIdentifier('anthropic:claude-3-5-sonnet');
            result.current.setTemperature(0.1);
            result.current.setReasoningEffort('high');
            result.current.toggleSkill('egm-bootstrap');
            result.current.setToolAccessMode('custom');
            result.current.toggleMcpServer('srv-github');
            result.current.toggleTool('security_scanner');
            result.current.setWebSearchEnabled(true);
        });

        expect(result.current.canSave).toBe(true);

        await act(async () => {
            await result.current.savePersonaDraft();
        });

        expect(result.current.isOpen).toBe(false);
        expect(createdInput).toMatchObject({
            name: 'Security Auditor',
            role: 'AppSec Lead',
            description: 'Audits code for vulnerabilities',
            systemPrompt: 'Analyze code for OWASP top 10 vulnerabilities.',
            modelIdentifier: 'anthropic:claude-3-5-sonnet',
            temperature: 0.1,
            reasoningEffort: 'high',
            skills: ['egm-bootstrap'],
            toolAccessMode: 'custom',
            allowedMcpServers: ['srv-github'],
            allowedTools: ['security_scanner'],
            webSearchEnabled: true,
        });
    });

    it('populates all fields when editing an existing persona and updates it', async () => {
        let updatedId: string | null = null;
        let updatedInput: Partial<NewPersona> | null = null;

        const appDataSource = createMockAppDataSource({
            persona: {
                getAll: async () => [mockPersona1],
                update: async (id, input) => {
                    updatedId = id;
                    updatedInput = input;
                    return {
                        ...mockPersona1,
                        ...input,
                    } as Persona;
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => usePersonaPageState(), { wrapper });

        act(() => {
            result.current.editPersona(mockPersona1);
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.name).toBe('Lead Architect');
        expect(result.current.role).toBe('Staff Architect');
        expect(result.current.modelIdentifier).toBe('anthropic:claude-3-7-sonnet');
        expect(result.current.temperature).toBe(0.2);
        expect(result.current.skills).toEqual(['egm-bootstrap']);
        expect(result.current.toolAccessMode).toBe('custom');
        expect(result.current.allowedMcpServers).toEqual(['srv-1']);

        // Toggle another skill
        act(() => {
            result.current.toggleSkill('run-workflow');
            result.current.setToolAccessMode('none');
        });

        await act(async () => {
            await result.current.savePersonaDraft();
        });

        expect(updatedId).toBe(mockPersona1.id);
        expect(updatedInput).toMatchObject({
            skills: ['egm-bootstrap', 'run-workflow'],
            toolAccessMode: 'none',
        });
        expect(result.current.isOpen).toBe(false);
    });

    it('deletes a persona when confirmed', async () => {
        let deletedId: string | null = null;
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        const appDataSource = createMockAppDataSource({
            persona: {
                getAll: async () => [mockPersona1],
                delete: async (id) => {
                    deletedId = id;
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => usePersonaPageState(), { wrapper });

        await act(async () => {
            await result.current.deletePersonaById(mockPersona1);
        });

        expect(deletedId).toBe(mockPersona1.id);
    });
});
