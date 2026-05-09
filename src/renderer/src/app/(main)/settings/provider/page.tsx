'use client';

import {ProviderManagement} from '@/components/provider-management';

export default function ProviderSettingsPage() {
    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-4">
            <ProviderManagement />
        </div>
    );
}
