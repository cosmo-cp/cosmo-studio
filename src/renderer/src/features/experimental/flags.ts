'use client';

import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';

export type ExperimentalFeature = 'tasks' | 'workflow';
const flagsKey = 'experimental-flags';

// Share evaluated choices across the settings page and navigation.
export function useExperimentalFlags() {
    return useBackendQuery(flagsKey, (backend) => backend.user.evaluateExperimentalFlags());
}

// Hide an experimental feature until its persisted value has been evaluated.
export function useExperimentalFlag(feature: ExperimentalFeature) {
    const { data } = useExperimentalFlags();
    return data?.[feature];
}

// Save the selected flag and refresh every subscriber after the write succeeds.
export function useSetExperimentalFlag() {
    return useBackendMutation({
        errorMessage: 'Unable to save experimental feature.',
        run: (backend, input: { feature: ExperimentalFeature; enabled: boolean }) =>
            backend.user.saveExperimentalFlag(input.feature, input.enabled),
        revalidate: async (_input, _result, cache) => cache.revalidateKeys([flagsKey]),
    });
}
