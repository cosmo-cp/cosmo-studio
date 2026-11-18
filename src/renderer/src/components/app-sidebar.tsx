'use client';

import { CosmoIcon } from '@/components/cosmo-icon';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useExperimentalFlag } from '@/features/experimental/flags';
import { getDefaultSettingsHref, getHomeHref, isSettingsPath } from '@/lib/settings-navigation';
import { cn } from '@/lib/utils';
import { MessageSquare, SettingsIcon, SquareCheck, Workflow } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const primaryMenuItems = [
    {
        title: 'Chat',
        href: '/chat',
        pathname: '/chat',
        icon: MessageSquare,
    },
    {
        title: 'Tasks',
        href: '/tasks',
        pathname: '/tasks',
        icon: SquareCheck,
        hidden: false,
    },
    {
        title: 'Workflows',
        href: '/workflow',
        pathname: '/workflow',
        icon: Workflow,
    },
] as const;

function isMenuItemActive(currentPathname: string, targetPathname: string): boolean {
    return currentPathname === targetPathname || currentPathname.startsWith(`${targetPathname}/`);
}

export function AppSidebar() {
    const pathname = usePathname();
    const tasksEnabled = useExperimentalFlag('tasks');
    const workflowEnabled = useExperimentalFlag('workflow');
    const inSettingsSection = isSettingsPath(pathname);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={getHomeHref(pathname)} prefetch={false}>
                                <div className="flex items-start justify-center w-10 h-10">
                                    <CosmoIcon size={40} />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold text-foreground">Cosmo</span>
                                    <span className="truncate text-xs text-muted-foreground">Studio</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {primaryMenuItems
                                .filter(
                                    (item) =>
                                        (item.title !== 'Tasks' || tasksEnabled) &&
                                        (item.title !== 'Workflows' || workflowEnabled),
                                )
                                .map((item) => {
                                    const active = !inSettingsSection && isMenuItemActive(pathname, item.pathname);
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={active}
                                                tooltip={item.title}
                                                className={cn(
                                                    'gap-3 rounded-lg',
                                                    active &&
                                                        'bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold',
                                                )}
                                            >
                                                <Link href={item.href} prefetch={false}>
                                                    <item.icon className="size-4 shrink-0" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            {/* Settings Link */}
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={inSettingsSection}
                                    tooltip="Settings"
                                    className={cn(
                                        'gap-3 rounded-lg',
                                        inSettingsSection &&
                                            'bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold',
                                    )}
                                >
                                    <Link href={getDefaultSettingsHref()} prefetch={false}>
                                        <SettingsIcon className="size-4 shrink-0" />
                                        <span className="flex-1">Settings</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    {/* User Profile Menu */}
                    <SidebarMenuItem>
                        <NavUser />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
