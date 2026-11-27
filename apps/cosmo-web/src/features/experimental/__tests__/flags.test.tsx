import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExperimentalFlag, useExperimentalFlags } from '../flags';

vi.mock('@/lib/store/backend-hooks', () => ({
    useBackendQuery: () => ({ data: { tasks: false, workflow: true } }),
    useBackendMutation: vi.fn(),
}));

describe('experimental flags', () => {
    it('exposes evaluated values to feature consumers', () => {
        expect(renderHook(() => useExperimentalFlag('tasks')).result.current).toBe(false);
        expect(renderHook(() => useExperimentalFlag('workflow')).result.current).toBe(true);
        expect(renderHook(() => useExperimentalFlags()).result.current.data).toEqual({ tasks: false, workflow: true });
    });
});
