import { useBackendQuery } from '@/lib/store/backend-hooks';

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
