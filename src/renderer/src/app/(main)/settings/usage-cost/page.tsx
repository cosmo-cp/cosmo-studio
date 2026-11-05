'use client';

import { SettingsPlaceholderPage } from '@/components/settings-placeholder-page';
import { BarChart3 } from 'lucide-react';

export default function UsageCostSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Usage & Cost"
            description="Track token consumption, compute credits, and cost analytics across providers."
            icon={BarChart3}
        />
    );
}
