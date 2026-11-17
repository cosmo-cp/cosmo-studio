'use client';

import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useUserProfileQuery } from '@/features/user/user-api';
import {
    Bug,
    CircleArrowDown,
    CircleHelp,
    CircleUser,
    FilePenLine,
    FileText,
    FlaskConical,
    Keyboard,
    LifeBuoy,
    ShieldCheck,
    Smile,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * User navigation component rendered at the bottom of the sidebar.
 * Displays current user profile and actions including upgrade, settings, profile, and help menu with full suboptions.
 */
export function NavUser() {
    const { isMobile } = useSidebar();
    const { user } = useUserProfileQuery();
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === '/') {
                event.preventDefault();
                setIsShortcutsOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const displayName = user?.name?.trim() ? user.name : 'Gaurav';
    const displayInitials = user?.initials?.trim() ? user.initials : displayName.slice(0, 2).toUpperCase() || 'GA';

    const openExternalUrl = (url: string) => {
        if (typeof window !== 'undefined') {
            window.open(url, '_blank');
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                        size="lg"
                        tooltip={displayName}
                        className="cursor-pointer gap-2.5 rounded-lg border border-border/40 hover:bg-muted/60 p-2 data-[state=open]:bg-muted/80"
                    >
                        <div className="size-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-2xs overflow-hidden">
                            {user?.photo ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={user.photo} alt={displayName} className="size-full object-cover" />
                            ) : (
                                displayInitials
                            )}
                        </div>
                        <div className="grid flex-1 text-left text-xs leading-tight">
                            <span className="truncate font-semibold text-foreground text-sm">{displayName}</span>
                        </div>
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side={isMobile ? 'bottom' : 'top'}
                    align="start"
                    sideOffset={8}
                    className="w-68 min-w-64 rounded-2xl p-1.5 shadow-xl border border-border/60 bg-popover text-popover-foreground"
                >
                    {/* Personalization */}
                    <DropdownMenuItem
                        asChild
                        className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                    >
                        <Link href="/personalization/general" prefetch={false}>
                            <Smile className="size-4 shrink-0" />
                            <span>Personalization</span>
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        asChild
                        className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                    >
                        <Link href="/experimental" prefetch={false}>
                            <FlaskConical className="size-4 shrink-0" />
                            <span>Experimental</span>
                        </Link>
                    </DropdownMenuItem>

                    {/* Profile */}
                    <DropdownMenuItem
                        asChild
                        className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                    >
                        <Link href="/profile" prefetch={false}>
                            <CircleUser className="size-4 shrink-0" />
                            <span>Profile</span>
                        </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1.5" />

                    {/* Help Submenu */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium">
                            <LifeBuoy className="size-4 shrink-0" />
                            <span>Help</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent
                            sideOffset={8}
                            className="w-56 rounded-2xl p-1.5 shadow-xl border border-border/60 bg-popover text-popover-foreground"
                        >
                            {/* Help center */}
                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() => openExternalUrl('https://cosmocp.com/docs/home')}
                            >
                                <CircleHelp className="size-4 shrink-0" />
                                <span>Help center</span>
                            </DropdownMenuItem>

                            {/* Privacy center */}
                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() => openExternalUrl('https://cosmocp.com/docs/privacy-and-data')}
                            >
                                <ShieldCheck className="size-4 shrink-0" />
                                <span>Privacy guidance</span>
                            </DropdownMenuItem>

                            {/* Release notes */}
                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() => openExternalUrl('https://cosmocp.com/docs/release-notes')}
                            >
                                <FilePenLine className="size-4 shrink-0" />
                                <span>Release notes</span>
                            </DropdownMenuItem>

                            {/* Download apps */}
                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() => openExternalUrl('https://cosmocp.com/download')}
                            >
                                <CircleArrowDown className="size-4 shrink-0" />
                                <span>Download apps</span>
                            </DropdownMenuItem>

                            {/* Keyboard shortcuts */}
                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() => setIsShortcutsOpen(true)}
                            >
                                <Keyboard className="size-4 shrink-0" />
                                <span className="flex-1">Keyboard shortcuts</span>
                                <DropdownMenuShortcut>⌘/ or Ctrl+/</DropdownMenuShortcut>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1.5" />

                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() =>
                                    openExternalUrl('https://github.com/cosmo-cp/cosmo-studio/blob/main/LICENSE')
                                }
                            >
                                <FileText className="size-4 shrink-0" />
                                <span>Software license</span>
                            </DropdownMenuItem>

                            {/* Report a bug */}
                            <DropdownMenuItem
                                className="flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer text-sm font-medium"
                                onClick={() => openExternalUrl('https://github.com/cosmo-cp/cosmo-studio/issues')}
                            >
                                <Bug className="size-4 shrink-0" />
                                <span>Report a bug</span>
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>

            <KeyboardShortcutsDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
        </>
    );
}
