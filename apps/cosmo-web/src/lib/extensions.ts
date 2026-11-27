import type { LucideIcon } from 'lucide-react';
import type React from 'react';

export interface ExtensionItem {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: 'EE' | 'Paid';
    component?: React.ComponentType;
}

class ExtensionRegistryImpl {
    private readonly navItems = new Map<string, ExtensionItem>();
    private readonly slots = new Map<string, React.ComponentType>();

    /** Registers an enterprise navigation item without mutating core settings routes. */
    public registerNavItem(item: ExtensionItem): void {
        this.navItems.set(item.id, item);
    }

    /** Returns registered extension navigation items in registration order. */
    public getNavItems(): ExtensionItem[] {
        return Array.from(this.navItems.values());
    }

    /** Registers a UI component into a named layout extension slot. */
    public registerSlot(slotName: string, component: React.ComponentType): void {
        this.slots.set(slotName, component);
    }

    /** Resolves an optional extension component mounted inside core views. */
    public getSlotComponent(slotName: string): React.ComponentType | undefined {
        return this.slots.get(slotName);
    }

    /** Clears registered items and slots (intended for unit test isolation). */
    public reset(): void {
        this.navItems.clear();
        this.slots.clear();
    }
}

export const extensionRegistry = new ExtensionRegistryImpl();
