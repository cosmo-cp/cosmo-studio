'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProviderManagement } from '@/components/provider-management';
import { SiteFooter } from '@/components/site-footer';

export default function SettingsPage() {
    const [selectedSetting, setSelectedSettings] = useState('Provider');

    const settingsItems = [
        {
            name: 'Provider',
        },
    ];
    return (
        <div className="flex flex-col p-2 md:p-4 h-full w-full">
            <header className="mb-2">
                <h3 className="text-2xl font-semibold">Settings</h3>
            </header>
            <div className="flex flex-row flex-wrap justify-start gap-6 h-full w-full flex-1">
                <Card className="w-1/5 h-full">
                    <CardContent>
                        {settingsItems.map((item) => (
                            <div
                                key={item.name}
                                className={cn(
                                    'flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors group',
                                    selectedSetting === item.name && 'bg-muted',
                                )}
                                onClick={() => setSelectedSettings(item.name)}
                            >
                                <span className="font-medium">{item.name}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="h-full flex-1">
                    <CardContent>{selectedSetting === 'Provider' && <ProviderManagement />}</CardContent>
                </Card>
            </div>
            <SiteFooter />
        </div>
    );
}
