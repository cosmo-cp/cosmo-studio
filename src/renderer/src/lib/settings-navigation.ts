import {
    BarChart3,
    Bot,
    Box,
    Cable,
    CircleUserRound,
    Command,
    CreditCard,
    Folder,
    Globe,
    PlugZap,
    Settings2,
    Share2,
    Shield,
    Users,
    Wrench,
    Zap,
    type LucideIcon,
} from 'lucide-react';

export type SettingsSectionSlug = 'provider' | 'persona' | 'command' | 'mcp-server' | 'web-search' | 'agents';

type SettingsSection = {
    slug: SettingsSectionSlug;
    title: string;
    description: string;
    icon: LucideIcon;
    hidden?: boolean;
};

export const settingsSections: readonly SettingsSection[] = [
    {
        slug: 'provider',
        title: 'Provider',
        description: 'Manage AI providers, credentials, and available models.',
        icon: PlugZap,
    },
    {
        slug: 'persona',
        title: 'Persona',
        description: 'Create and manage reusable personas for chat instructions.',
        icon: CircleUserRound,
    },
    {
        slug: 'command',
        title: 'Command',
        description: 'Create and manage reusable commands for quick actions.',
        icon: Command,
    },
    {
        slug: 'mcp-server',
        title: 'MCP Servers',
        description: 'Manage local and remote MCP server definitions.',
        icon: Cable,
    },
    {
        slug: 'web-search',
        title: 'Web search',
        description: 'Configure where web search settings live in the app.',
        icon: Globe,
        hidden: true,
    },
    {
        slug: 'agents',
        title: 'Agents',
        description: 'Manage local ACP agents and registry installs.',
        icon: Bot,
    },
] as const;

export interface NavSettingsSection {
    slug: string;
    title: string;
    icon: LucideIcon;
    href: string;
}

export const workspaceSettingsSections: readonly NavSettingsSection[] = [
    { slug: 'general', title: 'General', icon: Settings2, href: '/settings/general' },
    { slug: 'provider', title: 'Providers', icon: Box, href: '/settings/provider' },
    { slug: 'agents', title: 'Agents', icon: Zap, href: '/settings/agents' },
    { slug: 'command', title: 'Tools', icon: Wrench, href: '/settings/command' },
    { slug: 'mcp-server', title: 'MCP Servers', icon: Share2, href: '/settings/mcp-server' },
    { slug: 'persona', title: 'Persona', icon: CircleUserRound, href: '/settings/persona' },
] as const;

export const organizationSettingsSections: readonly NavSettingsSection[] = [
    { slug: 'usage-cost', title: 'Usage & Cost', icon: BarChart3, href: '/settings/usage-cost' },
    { slug: 'projects', title: 'Projects', icon: Folder, href: '/settings/projects' },
    { slug: 'guardrails', title: 'Guardrails', icon: Shield, href: '/settings/guardrails' },
    { slug: 'team', title: 'Team', icon: Users, href: '/settings/team' },
    { slug: 'billing', title: 'Billing', icon: CreditCard, href: '/settings/billing' },
] as const;

export function getVisibleSettingsSections(): readonly SettingsSection[] {
    return settingsSections.filter((section) => !section.hidden);
}

function getDefaultSettingsSection(): SettingsSection {
    const section = getVisibleSettingsSections()[0];

    if (!section) {
        throw new Error('At least one visible settings section must be configured.');
    }

    return section;
}

export function isSettingsPath(pathname: string): boolean {
    return pathname === '/settings' || pathname.startsWith('/settings/');
}

export function getHomeHref(pathname: string): string {
    void pathname;
    return '/chat';
}

export function getSettingsLandingHref(slug: SettingsSectionSlug): string {
    return `/settings/${slug}`;
}

export function getDefaultSettingsHref(): string {
    return getSettingsLandingHref(getDefaultSettingsSection().slug);
}

export function getDefaultSettingsChildHref(): string {
    return getSettingsLandingHref(getDefaultSettingsSection().slug);
}

export function getSettingsItemHref(slug: SettingsSectionSlug): string {
    return getSettingsLandingHref(slug);
}

export function isSettingsItemActive(pathname: string, slug: string): boolean {
    if (slug === 'provider') {
        return pathname === '/settings/provider' || pathname === '/settings';
    }
    return pathname === `/settings/${slug}` || pathname.startsWith(`/settings/${slug}/`);
}
