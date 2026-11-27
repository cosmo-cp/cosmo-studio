import { StoreProvider } from '@/app/store-provider';
import {
    useEvaluateGuardrailsMutation,
    useGetGuardrailsConfigQuery,
    useSaveGuardrailsConfigMutation,
} from '@/features/guardrails/guardrails-api';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { GuardrailsConfigView, GuardrailsEvaluateResult } from 'core/dto';
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

function createWrapper(overrides = {}) {
    const dataSource = createMockAppDataSource(overrides);
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <StoreProvider appDataSource={dataSource}>{children}</StoreProvider>;
    };
}

describe('guardrails-api hooks', () => {
    it('queries guardrails configuration', async () => {
        const getConfigMock = vi.fn().mockResolvedValue(mockConfig);
        const wrapper = createWrapper({
            guardrails: { getConfig: getConfigMock },
        });

        const { result } = renderHook(() => useGetGuardrailsConfigQuery(), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockConfig);
        });
        expect(getConfigMock).toHaveBeenCalled();
    });

    it('mutates and saves guardrails configuration', async () => {
        const savedConfig: GuardrailsConfigView = {
            ...mockConfig,
            injectionThreshold: 0.85,
        };
        const saveMock = vi.fn().mockResolvedValue(savedConfig);
        const wrapper = createWrapper({
            guardrails: { saveConfig: saveMock },
        });

        const { result } = renderHook(() => useSaveGuardrailsConfigMutation(), { wrapper });

        let res: { data?: GuardrailsConfigView; error?: string } | undefined;
        await act(async () => {
            res = await result.current[0]({
                enabled: true,
                injectionEnabled: true,
                injectionMode: 'heuristic',
                injectionThreshold: 0.85,
                leakageEnabled: true,
                leakageMode: 'heuristic',
                leakageThreshold: 0.7,
                piiEnabled: true,
                piiMode: 'redact',
                secretEnabled: true,
                secretMode: 'block',
            });
        });

        expect(res?.data).toEqual(savedConfig);
        expect(saveMock).toHaveBeenCalled();
    });

    it('evaluates text with guardrails mutation', async () => {
        const evalResult: GuardrailsEvaluateResult = {
            passed: false,
            blocked: true,
            redacted: false,
            violations: [
                { guardId: 'injection', guardName: 'Injection Guard', passed: false, reason: 'Attack detected' },
            ],
            originalText: 'Attack',
        };
        const evalMock = vi.fn().mockResolvedValue(evalResult);
        const wrapper = createWrapper({
            guardrails: { evaluate: evalMock },
        });

        const { result } = renderHook(() => useEvaluateGuardrailsMutation(), { wrapper });

        let res: { data?: GuardrailsEvaluateResult; error?: string } | undefined;
        await act(async () => {
            res = await result.current[0]('Attack');
        });

        expect(res?.data).toEqual(evalResult);
        expect(evalMock).toHaveBeenCalledWith('Attack');
    });
});
