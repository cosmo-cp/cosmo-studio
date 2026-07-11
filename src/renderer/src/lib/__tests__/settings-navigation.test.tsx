import {describe, expect, it} from 'vitest';
import {
    getDefaultSettingsChildHref,
    getDefaultSettingsHref,
    getVisibleSettingsSections,
    settingsSections,
} from '@/lib/settings-navigation';

describe('settings navigation', () => {
    it('hides sections that opt out of the settings UI', () => {
        expect(getVisibleSettingsSections().map((section) => section.slug)).toEqual([
            'provider',
            'persona',
            'command',
            'mcp-server',
            'agents',
        ]);
        expect(settingsSections.find((section) => section.slug === 'web-search')?.hidden).toBe(
            true
        );
    });

    it('uses the first visible settings section as the default destination', () => {
        expect(getDefaultSettingsHref()).toBe('./settings/provider');
        expect(getDefaultSettingsChildHref()).toBe('./provider');
    });
});
