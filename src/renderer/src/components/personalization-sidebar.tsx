'use client';

import { cn } from '@/lib/utils';
import { Bell, CircleUserRound, Keyboard, Palette, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections = [
    { title: 'General', slug: 'general', icon: Settings2 },
    { title: 'Appearance', slug: 'appearance', icon: Palette },
    { title: 'Notifications', slug: 'notifications', icon: Bell },
    { title: 'Keyboard', slug: 'keyboard', icon: Keyboard },
    { title: 'Profile', slug: 'profile', icon: CircleUserRound },
];

export function PersonalizationSidebar() {
    const pathname = usePathname();
    return (
        <aside
            aria-label="Personalization navigation"
            className="h-full w-56 shrink-0 overflow-y-auto border-r border-border bg-background/50"
        >
            <div className="px-5 pt-6 pb-3">
                <h2 className="text-xl font-bold tracking-tight">Personalization</h2>
            </div>
            <nav className="space-y-1 px-3 py-2">
                {sections.map(({ title, slug, icon: Icon }) => {
                    const href = `/personalization/${slug}`;
                    const active = pathname === href || (slug === 'general' && pathname === '/personalization');
                    return (
                        <Link
                            key={slug}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                active
                                    ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span>{title}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
