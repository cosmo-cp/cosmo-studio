import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { SkillManifest, SkillUploadInput } from 'core/dto';

const skillKeys = {
    list: ['skills', 'list'] as const,
    detail: (name: string) => ['skills', 'detail', name] as const,
    content: (name: string) => ['skills', 'content', name] as const,
};

export function useGetSkillsQuery() {
    return useBackendQuery(skillKeys.list, (appDataSource) => appDataSource.skill.getAll());
}

export function useGetSkillByNameQuery(name: string | null | undefined) {
    return useBackendQuery(
        name ? skillKeys.detail(name) : null,
        (appDataSource) => appDataSource.skill.getByName(name ?? ''),
        { skip: !name },
    );
}

export function useGetSkillContentQuery(name: string | null | undefined) {
    return useBackendQuery(
        name ? skillKeys.content(name) : null,
        (appDataSource) => appDataSource.skill.getContent(name ?? ''),
        { skip: !name },
    );
}

export function useUploadSkillMutation() {
    return useBackendMutation<SkillUploadInput, SkillManifest>({
        run: (appDataSource, input) => appDataSource.skill.upload(input),
        revalidate: async (_input, result, { revalidateKeys }) => {
            await revalidateKeys([skillKeys.list, skillKeys.detail(result.name), skillKeys.content(result.name)]);
        },
        successMessage: 'Skill uploaded successfully',
        errorMessage: 'Failed to upload skill',
    });
}

export function useDeleteSkillMutation() {
    return useBackendMutation<string, boolean>({
        run: (appDataSource, name) => appDataSource.skill.delete(name),
        revalidate: async (name, _result, { revalidateKeys }) => {
            await revalidateKeys([skillKeys.list, skillKeys.detail(name), skillKeys.content(name)]);
        },
        successMessage: 'Skill deleted successfully',
        errorMessage: 'Failed to delete skill',
    });
}
