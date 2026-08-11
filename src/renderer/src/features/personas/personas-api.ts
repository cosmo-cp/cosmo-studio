import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { PersonaCreateInput } from 'core/dto';

const personaKeys = {
    list: ['personas', 'list'] as const,
    detail: (personaId: string) => ['personas', 'detail', personaId] as const,
};

export function useGetPersonasQuery() {
    return useBackendQuery(personaKeys.list, (appDataSource) => appDataSource.persona.getAll());
}

export function useGetPersonaByIdQuery(personaId: string | null | undefined) {
    return useBackendQuery(
        personaId ? personaKeys.detail(personaId) : null,
        (appDataSource) => appDataSource.persona.getById(personaId ?? ''),
        { skip: !personaId },
    );
}

export function useSavePersonaMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save persona',
        run: (appDataSource, { personaId, input }: { personaId?: string; input: PersonaCreateInput }) =>
            personaId ? appDataSource.persona.update(personaId, input) : appDataSource.persona.create(input),
        revalidate: async ({ personaId }, _result, { revalidateKeys }) => {
            await revalidateKeys([personaKeys.list, ...(personaId ? [personaKeys.detail(personaId)] : [])]);
        },
    });
}

export function useDeletePersonaMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete persona',
        run: (appDataSource, personaId: string) => appDataSource.persona.delete(personaId),
        revalidate: async (personaId, _result, { revalidateKeys }) => {
            await revalidateKeys([personaKeys.list, personaKeys.detail(personaId)]);
        },
    });
}
