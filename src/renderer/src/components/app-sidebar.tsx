'use client';

import { CosmoIcon } from '@/components/cosmo-icon';
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
import { getDefaultSettingsHref, getHomeHref, isSettingsPath } from '@/lib/settings-navigation';
import { cn } from '@/lib/utils';
import { BarChart2, BookOpen, Bot, ChevronRight, Folder, MessageSquare, SettingsIcon, Wrench, SquareCheck } from 'lucide-react';
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
        title: 'Agents',
        href: '/settings/agents',
        pathname: '/settings/agents',
        icon: Bot,
    },
    {
        title: 'Tools',
        href: '/settings/command',
        pathname: '/settings/command',
        icon: Wrench,
    },
    {
        title: 'Tasks',
        href: '/tasks',
        pathname: '/tasks',
        icon: SquareCheck,
        hidden: false,
    },
    {
        title: 'Projects',
        href: '/workflow',
        pathname: '/workflow',
        icon: Folder,
    },
    {
        title: 'Knowledge',
        href: '/knowledge',
        pathname: '/knowledge',
        icon: BookOpen,
    },
    {
        title: 'Usage',
        href: '/settings/usage-cost',
        pathname: '/settings/usage-cost',
        icon: BarChart2,
    },
] as const;

function isMenuItemActive(currentPathname: string, targetPathname: string): boolean {
    return currentPathname === targetPathname || currentPathname.startsWith(`${targetPathname}/`);
}

export function AppSidebar() {
    const pathname = usePathname();
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
                            {primaryMenuItems.map((item) => {
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
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
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

                    {/* Workspace Profile Button */}
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="cursor-pointer gap-2.5 rounded-lg border border-border/40 hover:bg-muted/60 p-2"
                        >
                            <div className="size-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                C
                            </div>
                            <div className="grid flex-1 text-left text-xs leading-tight">
                                <span className="truncate font-semibold text-foreground">Cosmo Workspace</span>
                                <span className="truncate text-[10px] text-muted-foreground">Professional</span>
                            </div>
                            <ChevronRight className="size-3.5 text-muted-foreground ml-auto shrink-0" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
