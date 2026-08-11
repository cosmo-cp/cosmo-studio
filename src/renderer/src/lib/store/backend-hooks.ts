import { useAppDataSource, useAppStore } from '@/lib/store/hooks';
import { useCallback, useMemo, useState } from 'react';
import useSWR, { useSWRConfig, type Key, type SWRConfiguration } from 'swr';
import type { AppDataSource } from './app-data-source';

export type MutationResult<Result> = { data: Result } | { error: string };

type MutationTrigger<Arg, Result> = [Arg] extends [void]
    ? () => Promise<MutationResult<Result>>
    : (arg: Arg) => Promise<MutationResult<Result>>;

interface BackendQueryOptions<Result> extends Omit<SWRConfiguration<Result, string>, 'fetcher'> {
    skip?: boolean;
}

interface BackendMutationOptions<Arg, Result> {
    errorMessage: string;
    successMessage?: string | ((result: Result, arg: Arg) => string | null);
    run: (appDataSource: AppDataSource, arg: Arg) => Promise<Result>;
    revalidate?: (arg: Arg, result: Result, helpers: BackendCacheHelpers) => Promise<void> | void;
}

export interface BackendCacheHelpers {
    revalidateKeys: (keys: Key[]) => Promise<void>;
    revalidateMatching: (predicate: (key: Key) => boolean) => Promise<void>;
    setCachedValue: <Result>(key: Key, value: Result | ((currentValue: Result | undefined) => Result)) => Promise<void>;
}

// Normalize backend failures so components only handle one shape.
export function getBackendErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'string' && error.trim().length > 0) {
        return error;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallbackMessage;
}

// Keep backend hook logging side-effect free so tests do not need renderer logger mocks.
function logBackendError(message: string, error: unknown) {
    console.error(message, error);
}

// Wrap SWR so feature hooks stay explicit and backend-aware.
export function useBackendQuery<Result>(
    key: Key,
    run: (appDataSource: AppDataSource) => Promise<Result>,
    options: BackendQueryOptions<Result> = {},
) {
    const appDataSource = useAppDataSource();
    const { skip = false, ...swrOptions } = options;
    const query = useSWR<Result, string>(skip ? null : key, () => run(appDataSource), {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        ...swrOptions,
    });

    const refetch = useCallback(async () => {
        const result = await query.mutate();
        return result ?? undefined;
    }, [query]);

    return {
        ...query,
        isFetching: query.isValidating,
        refetch,
    };
}

// Keep mutation hooks tiny while still centralizing toast and cache behavior.
export function useBackendMutation<Arg, Result>({
    errorMessage,
    successMessage,
    run,
    revalidate,
}: BackendMutationOptions<Arg, Result>) {
    const appDataSource = useAppDataSource();
    const enqueueToast = useAppStore((state) => state.enqueueToast);
    const { mutate } = useSWRConfig();
    const [isLoading, setIsLoading] = useState(false);

    const cacheHelpers = useMemo<BackendCacheHelpers>(
        () => ({
            revalidateKeys: async (keys) => {
                await Promise.all(keys.map((key) => mutate(key)));
            },
            revalidateMatching: async (predicate) => {
                await mutate(predicate);
            },
            setCachedValue: async (key, value) => {
                await mutate(key, value, {
                    revalidate: false,
                });
            },
        }),
        [mutate],
    );

    const trigger = useCallback(
        async (arg?: Arg): Promise<MutationResult<Result>> => {
            setIsLoading(true);

            try {
                const mutationArg = arg as Arg;
                const result = await run(appDataSource, mutationArg);
                await revalidate?.(mutationArg, result, cacheHelpers);

                if (successMessage) {
                    const description =
                        typeof successMessage === 'function' ? successMessage(result, mutationArg) : successMessage;
                    if (description) {
                        enqueueToast({
                            type: 'success',
                            description,
                        });
                    }
                }

                return {
                    data: result,
                };
            } catch (error) {
                const description = getBackendErrorMessage(error, errorMessage);
                logBackendError(errorMessage, error);
                enqueueToast({
                    type: 'error',
                    description,
                });
                return {
                    error: description,
                };
            } finally {
                setIsLoading(false);
            }
        },
        [appDataSource, cacheHelpers, enqueueToast, errorMessage, revalidate, run, successMessage],
    );

    return useMemo(() => [trigger as MutationTrigger<Arg, Result>, { isLoading }] as const, [isLoading, trigger]);
}
