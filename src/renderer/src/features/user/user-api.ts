import { StoreContext } from '@/app/store-provider';
import type { UserProfile } from 'core/dto';
import { useCallback, useContext, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

export const userKeys = {
    all: ['user'] as const,
    profile: () => ['user', 'profile'] as const,
};

export const DEFAULT_USER_PROFILE: UserProfile = {
    name: 'Gaurav',
    initials: 'GA',
    photo: null,
    isConfigured: false,
};

/**
 * Hook to retrieve user profile data from database, falling back gracefully if uninitialized or outside provider.
 */
export function useUserProfileQuery() {
    const store = useContext(StoreContext);
    const appDataSource = store?.getState().appDataSource;

    const query = useSWR<UserProfile, string>(
        store ? userKeys.profile() : null,
        async () => {
            if (appDataSource?.user?.getProfile) {
                return appDataSource.user.getProfile();
            }
            return DEFAULT_USER_PROFILE;
        },
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        },
    );

    const user = query.data ?? (store && query.isLoading ? undefined : DEFAULT_USER_PROFILE);

    return {
        user,
        ...query,
        refetch: query.mutate,
    };
}

/**
 * Hook to save user profile name into database and revalidate active user cache.
 */
export function useSaveUserProfileMutation() {
    const store = useContext(StoreContext);
    const [isPending, setIsPending] = useState(false);
    const { mutate } = useSWRConfig();

    const saveProfile = useCallback(
        async (arg: string | { name: string; photo?: string | null }): Promise<UserProfile> => {
            const input = typeof arg === 'string' ? { name: arg, photo: undefined } : arg;
            const trimmed = input.name.trim();
            if (!store) {
                return {
                    name: trimmed,
                    initials: trimmed.slice(0, 2).toUpperCase() || 'GA',
                    photo: input.photo ?? null,
                    isConfigured: true,
                };
            }
            const appDataSource = store.getState().appDataSource;
            setIsPending(true);
            try {
                const updated = await appDataSource.user.saveProfile({
                    name: trimmed,
                    photo: input.photo,
                });
                await mutate(userKeys.profile(), updated, false);
                store.getState().enqueueToast({
                    type: 'success',
                    description: 'Profile updated successfully.',
                });
                return updated;
            } catch (error) {
                store.getState().enqueueToast({
                    type: 'error',
                    description: 'Failed to update profile. Please try again.',
                });
                throw error;
            } finally {
                setIsPending(false);
            }
        },
        [store, mutate],
    );

    return {
        saveProfile,
        isPending,
    };
}
