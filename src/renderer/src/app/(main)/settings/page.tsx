'use client';

import { useSettingsPageState } from '@/features/settings/use-settings-page-state';

export default function SettingsPage() {
    useSettingsPageState();

    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <div className="text-sm text-muted-foreground">Opening settings...</div>
        </div>
    );
}
