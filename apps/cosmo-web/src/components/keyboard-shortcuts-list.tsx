const SHORTCUTS = [
    {
        category: 'General',
        items: [
            { label: 'Toggle Sidebar', keys: ['⌘ / Ctrl', 'B'] },
            { label: 'Open Shortcuts', keys: ['⌘ / Ctrl', '/'] },
        ],
    },
    {
        category: 'Chat & Composer',
        items: [
            { label: 'Find in conversation', keys: ['⌘ / Ctrl', 'F'] },
            { label: 'Send message', keys: ['Enter'] },
            { label: 'New line', keys: ['Shift', 'Enter'] },
            { label: 'Mention Persona', keys: ['@'] },
            { label: 'Insert Command', keys: ['/'] },
        ],
    },
];

export function KeyboardShortcutsList() {
    return (
        <div className="flex flex-col gap-5 pt-2">
            {SHORTCUTS.map((section) => (
                <div key={section.category} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.category}
                    </span>
                    <div className="flex flex-col rounded-xl border border-border/60 divide-y divide-border/40 bg-muted/20">
                        {section.items.map((shortcut) => (
                            <div
                                key={shortcut.label}
                                className="flex items-center justify-between px-3.5 py-2.5 text-sm"
                            >
                                <span className="text-foreground">{shortcut.label}</span>
                                <div className="flex items-center gap-1">
                                    {shortcut.keys.map((k) => (
                                        <kbd
                                            key={k}
                                            className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/80 bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground shadow-2xs"
                                        >
                                            {k}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
