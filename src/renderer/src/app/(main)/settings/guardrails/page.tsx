'use client';

import { SettingsPlaceholderPage } from '@/components/settings-placeholder-page';
import { Shield } from 'lucide-react';

export default function GuardrailsSettingsPage() {
    return (
        <SettingsPlaceholderPage
            title="Guardrails"
            description="Set up content filtering, PII redaction policies, and prompt security controls."
            icon={Shield}
        />
    );
}
