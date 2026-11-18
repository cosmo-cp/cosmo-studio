'use client';

import { SettingsPlaceholderPage } from '@/components/settings-placeholder-page';
import { Folder } from 'lucide-react';

export default function ProjectsSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Projects"
            description="Organize workspace repositories, environments, and associated workspaces."
            icon={Folder}
        />
    );
}
