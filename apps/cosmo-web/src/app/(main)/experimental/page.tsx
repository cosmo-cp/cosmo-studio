'use client';

import { Switch } from '@/components/ui/switch';
import { useExperimentalFlags, useSetExperimentalFlag } from '@/features/experimental/flags';
import { FlagValues } from 'flags/react';

export default function ExperimentalPage() {
    const { data, error } = useExperimentalFlags();
    const [setFlag, { isLoading }] = useSetExperimentalFlag();
    const tasks = data?.tasks ?? false;
    const workflow = data?.workflow ?? false;

    return (
        <div className="overflow-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Experimental</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enable or disable experimental features on this device.
                    </p>
                </div>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        Unable to evaluate experimental features. Please try again.
                    </p>
                )}
                <FlagValues values={{ tasks, workflow }} />
                <div className="rounded-lg border bg-background divide-y">
                    {(
                        [
                            ['tasks', 'Tasks', tasks],
                            ['workflow', 'Workflow', workflow],
                        ] as const
                    ).map(([key, label, enabled]) => (
                        <div key={key} className="flex items-center justify-between gap-4 p-4">
                            <div>
                                <p className="font-medium">{label}</p>
                                <p className="text-sm text-muted-foreground">
                                    {data ? (enabled ? 'Enabled' : 'Disabled') : 'Checking…'}
                                </p>
                            </div>
                            <Switch
                                aria-label={`Enable ${label}`}
                                checked={enabled}
                                disabled={!data || isLoading}
                                onCheckedChange={(value) => void setFlag({ feature: key, enabled: value })}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
