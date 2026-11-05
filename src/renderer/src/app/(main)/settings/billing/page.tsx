'use client';

import { SettingsPlaceholderPage } from '@/components/settings-placeholder-page';
import { CreditCard } from 'lucide-react';

export default function BillingSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Billing"
            description="Manage subscription plans, payment methods, and invoices."
            icon={CreditCard}
        />
    );
}
