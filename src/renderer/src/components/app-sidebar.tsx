'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    Cable,
    ChevronLeft,
    ChevronRight,
    CircleUserRound,
    MessageCircle,
    SettingsIcon,
    Slash,
    Workflow,
} from 'lucide-react';
import {CosmoIcon} from '@/components/cosmo-icon';
import {
    getDefaultSettingsHref,
    getHomeHref,
    getSettingsItemHref,
    isSettingsItemActive,
    isSettingsPath,
    settingsSections,
} from '@/lib/settings-navigation';

const menuItems = [
    {
        title: 'Chat',
        href: './chat',
        pathname: '/chat',
        icon: MessageCircle,
    },
    {
        title: 'Workflow',
        href: './workflow',
        pathname: '/workflow',
        icon: Workflow,
    },
    {
        title: 'Persona',
        href: './persona',
        pathname: '/persona',
        icon: CircleUserRound,
    },
    {
        title: 'Command',
        href: './command',
        pathname: '/command',
        icon: Slash,
    },
    {
        title: 'MCP Servers',
        href: './mcp-server',
        pathname: '/mcp-server',
        icon: Cable,
    },
] as const;

function isMenuItemActive(currentPathname: string, targetPathname: string): boolean {
        return (
        currentPathname === targetPathname ||
        currentPathname.startsWith(`${targetPathname}/`)
    );
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
                                <div className="flex items-start justify-center">
                                    <CosmoIcon size={48} />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">Cosmo</span>
                                    <span className="truncate text-xs">Studio</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    {inSettingsSection && <SidebarGroupLabel>Settings</SidebarGroupLabel>}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {inSettingsSection ? (
                                <>
                                    {settingsSections.map((item) => (
                                        <SidebarMenuItem key={item.slug}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isSettingsItemActive(pathname, item.slug)}
                                            >
                                                <Link
                                                    href={getSettingsItemHref(pathname, item.slug)}
                                                    prefetch={false}
                                                >
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </>
                            ) : (
                                menuItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isMenuItemActive(pathname, item.pathname)}
                                        >
                                            <Link href={item.href} prefetch={false}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            {!inSettingsSection && (
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href={getDefaultSettingsHref()} prefetch={false}>
                                    <SettingsIcon />
                                    <span className="flex-1">Settings</span>
                                    <ChevronRight className="ml-auto" />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            )}
            {inSettingsSection && (
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href={getHomeHref(pathname)} prefetch={false}>
                                    <ChevronLeft />
                                    <span>Back</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            )}
        </Sidebar>
    );
}
