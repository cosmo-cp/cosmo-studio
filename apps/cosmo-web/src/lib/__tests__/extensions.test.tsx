import { CostOptimizerWidget } from '@/ee-stub/CostOptimizerWidget';
import { registerEnterpriseExtensions } from '@/ee-stub/register';
import { extensionRegistry } from '@/lib/extensions';
import { Sparkles } from 'lucide-react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('EE extension registry and Studio fallback stubs', () => {
    beforeEach(() => {
        extensionRegistry.reset();
    });

    it('registers and resolves nav items and UI slots without mutating Studio core', () => {
        const SlotComponent = () => {
            return null;
        };

        registerEnterpriseExtensions();
        expect(extensionRegistry.getNavItems()).toEqual([]);

        extensionRegistry.registerNavItem({
            id: 'usage',
            label: 'Usage',
            href: '/settings/usage',
            icon: Sparkles,
            badge: 'Paid',
        });
        extensionRegistry.registerSlot('chat.header', SlotComponent);

        expect(extensionRegistry.getNavItems()).toHaveLength(1);
        expect(extensionRegistry.getNavItems()[0]?.id).toBe('usage');
        expect(extensionRegistry.getSlotComponent('chat.header')).toBe(SlotComponent);
    });

    it('provides no-op Studio fallback components under @ee/*', () => {
        expect(CostOptimizerWidget({} as never)).toBeNull();
    });
});
