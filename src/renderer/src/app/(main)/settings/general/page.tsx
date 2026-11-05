'use client';

import { SettingsPlaceholderPage } from '@/components/settings-placeholder-page';
import { Settings2 } from 'lucide-react';

export default function GeneralSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="General"
            description="Manage your workspace preferences, appearance, and environment configurations."
            icon={Settings2}
        />
    );
}
