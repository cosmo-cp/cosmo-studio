import {
    Bot,
    Cable,
    CircleUserRound,
    Command,
    Globe,
    type LucideIcon,
    PlugZap,
} from 'lucide-react';

export type SettingsSectionSlug =
    | 'provider'
    | 'persona'
    | 'command'
    | 'mcp-server'
    | 'web-search'
    | 'agents';

type SettingsSection = {
    slug: SettingsSectionSlug;
    title: string;
    description: string;
    icon: LucideIcon;
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
    },
    {
        slug: 'agents',
        title: 'Agents',
        description: 'Manage local ACP agents and registry installs.',
        icon: Bot,
    }
] as const;

function getDefaultSettingsSection(): SettingsSection {
    const section = settingsSections[0];

    if (!section) {
        throw new Error('At least one settings section must be configured.');
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
    return `./settings/${slug}`;
}

export function getDefaultSettingsHref(): string {
    return getSettingsLandingHref(getDefaultSettingsSection().slug);
}

export function getDefaultSettingsChildHref(): string {
    return `./${getDefaultSettingsSection().slug}`;
}

export function getSettingsItemHref(
    pathname: string,
    slug: SettingsSectionSlug
): string {
    if (!isSettingsPath(pathname)) {
        return getSettingsLandingHref(slug);
    }

    return `./${slug}`;
}

export function isSettingsItemActive(
    pathname: string,
    slug: SettingsSectionSlug
): boolean {
    if (pathname === '/settings') {
        return slug === getDefaultSettingsSection().slug;
    }

    return pathname === `/settings/${slug}`;
}
