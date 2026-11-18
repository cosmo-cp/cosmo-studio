import { KeyboardShortcutsList } from '@/components/keyboard-shortcuts-list';

export default function KeyboardPage() {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div>
                <h1 className="text-lg font-medium">Keyboard</h1>
                <p className="mt-1 text-xs text-muted-foreground">Explore keyboard shortcuts for Cosmo Studio.</p>
            </div>
            <KeyboardShortcutsList />
        </div>
    );
}
