'use client';

import { useRouter } from 'next/navigation';
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
    useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Cable, CircleUserRound, MessageCircle, SettingsIcon, Slash } from 'lucide-react';
import { CosmoIcon } from '@/components/cosmo-icon';

export function AppSidebar() {
    useSidebar();
    useRouter();
    const menuItems = [
        {
            title: 'Chat',
            url: './',
            icon: MessageCircle,
        },
        {
            title: 'Persona',
            url: './persona',
            icon: CircleUserRound,
        },
        {
            title: 'Command',
            url: './command',
            icon: Slash,
        },
        {
            title: 'MCP Servers',
            url: './mcp-server',
            icon: Cable,
        },
    ];
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="./" prefetch={false}>
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
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url} prefetch={false}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="./settings" prefetch={false}>
                                <SettingsIcon />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
