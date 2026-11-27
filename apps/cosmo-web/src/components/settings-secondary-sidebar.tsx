'use client';

import { extensionRegistry } from '@/lib/extensions';
import { isSettingsItemActive, workspaceSettingsSections } from '@/lib/settings-navigation';
import { cn } from '@/lib/utils';
import { registerEnterpriseExtensions } from '@ee/register';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

registerEnterpriseExtensions();

export function SettingsSecondarySidebar() {
    const pathname = usePathname();
    const extensionNavItems = extensionRegistry.getNavItems();

    return (
        <aside
            aria-label="Settings navigation"
            className="w-56 shrink-0 border-r border-border h-full bg-background/50 flex flex-col overflow-y-auto select-none"
        >
            <div className="px-5 pt-6 pb-3">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Settings</h2>
            </div>

            <div className="px-3 py-2 pb-4">
                <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Workspace
                </p>
                <nav className="space-y-1">
                    {workspaceSettingsSections.map((item) => {
                        const active = isSettingsItemActive(pathname, item.slug);
                        return (
                            <Link
                                key={item.slug}
                                href={item.href}
                                data-active={active ? 'true' : undefined}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                )}
                            >
                                <item.icon className="size-4 shrink-0" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {extensionNavItems.length > 0 && (
                <div className="px-3 py-2 pb-4">
                    <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Enterprise
                    </p>
                    <nav className="space-y-1">
                        {extensionNavItems.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    data-active={active ? 'true' : undefined}
                                    className={cn(
                                        'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                    )}
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <item.icon className="size-4 shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                    {item.badge && (
                                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}
        </aside>
    );
}
