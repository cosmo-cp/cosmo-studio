'use client';

import { SettingsPlaceholderPage } from '@/components/settings-placeholder-page';
import { Users } from 'lucide-react';

export default function TeamSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Team"
            description="Manage team members, roles, invitations, and access permissions."
            icon={Users}
        />
    );
}
