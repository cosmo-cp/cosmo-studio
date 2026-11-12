import {
    getDefaultSettingsChildHref,
    getDefaultSettingsHref,
    getVisibleSettingsSections,
    settingsSections,
    workspaceSettingsSections,
} from '@/lib/settings-navigation';
import { describe, expect, it } from 'vitest';

describe('settings navigation', () => {
    it('hides sections that opt out of the settings UI', () => {
        expect(getVisibleSettingsSections().map((section) => section.slug)).toEqual([
            'provider',
            'persona',
            'command',
            'mcp-server',
            'agents',
            'workspaces',
        ]);
        expect(settingsSections.find((section) => section.slug === 'web-search')?.hidden).toBe(true);
    });

    it('uses the first visible settings section as the default destination', () => {
        expect(getDefaultSettingsHref()).toBe('/settings/provider');
        expect(getDefaultSettingsChildHref()).toBe('/settings/provider');
    });

    it('defines workspace settings sections without models', () => {
        const slugs = workspaceSettingsSections.map((section) => section.slug);
        expect(slugs).toEqual(['general', 'provider', 'agents', 'command', 'mcp-server', 'persona']);
        expect(slugs).not.toContain('models');
    });
});
