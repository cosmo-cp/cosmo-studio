'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export default function AppearancePage() {
    const { theme, setTheme } = useTheme();
    return (
        <div className="flex flex-col gap-4 p-4">
            <div>
                <h1 className="text-lg font-medium">Appearance</h1>
                <p className="mt-1 text-xs text-muted-foreground">Choose how Cosmo Studio looks on this device.</p>
            </div>
            <section className="rounded-md border p-4">
                <h2 className="text-sm font-medium">Theme</h2>
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Appearance theme">
                    {(['light', 'dark', 'system'] as const).map((option) => (
                        <Button
                            key={option}
                            type="button"
                            variant={theme === option ? 'default' : 'outline'}
                            aria-pressed={theme === option}
                            onClick={() => setTheme(option)}
                            className="capitalize"
                        >
                            {option}
                        </Button>
                    ))}
                </div>
            </section>
        </div>
    );
}
