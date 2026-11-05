'use client';

import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface SettingsPlaceholderPageProps {
    title: string;
    description: string;
    icon: LucideIcon;
}

export function SettingsPlaceholderPage({ title, description, icon: Icon }: SettingsPlaceholderPageProps) {
    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>

            <Card className="p-12 text-center border-dashed rounded-xl bg-card">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-muted rounded-full">
                        <Icon className="size-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-foreground">{title} Settings</h3>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Configure your workspace and organization preferences for {title.toLowerCase()}.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
