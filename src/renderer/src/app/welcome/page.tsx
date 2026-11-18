'use client';

import { CosmoIcon } from '@/components/cosmo-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSaveUserProfileMutation, useUserProfileQuery } from '@/features/user/user-api';
import { ArrowRight, Camera, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

function WelcomeForm({
    defaultName,
    defaultPhoto,
    isPending,
    onSave,
}: {
    defaultName: string;
    defaultPhoto?: string | null;
    isPending: boolean;
    onSave: (name: string, photo?: string | null) => Promise<void>;
}) {
    const [name, setName] = useState(defaultName);
    const [photo, setPhoto] = useState<string | null>(defaultPhoto || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                setPhoto(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || isPending) return;

        try {
            await onSave(trimmed, photo);
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : '';

    return (
        <div className="h-screen w-full flex items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md flex flex-col items-center text-center">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <CosmoIcon size={44} />
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Welcome to Cosmo</h1>
                <p className="mt-2 text-sm text-muted-foreground">What should we call you?</p>

                <form onSubmit={handleSubmit} className="mt-6 w-full flex flex-col items-center gap-4">
                    {/* Optional Photo Upload */}
                    <div className="relative mb-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="size-20 rounded-full border-2 border-border/60 bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-xs overflow-hidden cursor-pointer group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Upload photo"
                        >
                            {photo ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={photo} alt={name || 'Avatar'} className="size-full object-cover" />
                            ) : initials ? (
                                <span>{initials}</span>
                            ) : (
                                <Camera className="size-6 text-white/80" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <Camera className="size-5 text-white" />
                            </div>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            data-testid="welcome-photo-input"
                        />
                    </div>

                    <div className="w-full flex flex-col text-left gap-1.5">
                        <label htmlFor="user-name" className="text-xs font-semibold text-muted-foreground">
                            Your Name
                        </label>
                        <Input
                            id="user-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            autoFocus
                            required
                            disabled={isPending}
                            className="h-11 rounded-xl px-3.5 text-base bg-muted/50 border border-border/60 focus-visible:bg-background"
                        />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        disabled={!name.trim() || isPending}
                        className="h-11 w-full rounded-xl gap-2 font-medium cursor-pointer"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <span>Continue</span>
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function WelcomePage() {
    const router = useRouter();
    const { user } = useUserProfileQuery();
    const { saveProfile, isPending } = useSaveUserProfileMutation();
    const [noticeAcknowledged, setNoticeAcknowledged] = useState(false);

    const initialName = user?.isConfigured ? user.name : '';
    const initialPhoto = user?.isConfigured ? user.photo : null;

    if (!noticeAcknowledged) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
                <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold">Before you start</h1>
                    <p className="mt-3 text-sm text-muted-foreground">A few things to know when using Cosmo Studio:</p>
                    <ul className="mt-4 list-disc space-y-3 pl-5 text-sm">
                        <li>AI responses can be inaccurate. Check important information and review generated code.</li>
                        <li>
                            Agents and tools can access or change files and other resources, sometimes without asking
                            for approval. Only enable those you trust, review their configuration, and keep backups.
                        </li>
                        <li>
                            Cloud providers receive the information you send them. Review their privacy practices before
                            sharing sensitive data.
                        </li>
                    </ul>
                    <p className="mt-5 text-sm text-muted-foreground">
                        Read the{' '}
                        <a
                            className="underline underline-offset-4"
                            href="https://github.com/cosmo-cp/cosmo-studio/blob/main/LICENSE"
                            target="_blank"
                            rel="noreferrer"
                        >
                            software license
                        </a>{' '}
                        and{' '}
                        <a
                            className="underline underline-offset-4"
                            href="https://cosmocp.com/docs/privacy-and-data"
                            target="_blank"
                            rel="noreferrer"
                        >
                            privacy and data guide
                        </a>
                        .
                    </p>
                    <Button className="mt-6 w-full" onClick={() => setNoticeAcknowledged(true)}>
                        I understand
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <WelcomeForm
            key={initialName}
            defaultName={initialName}
            defaultPhoto={initialPhoto}
            isPending={isPending}
            onSave={async (name: string, photo?: string | null) => {
                await saveProfile({ name, photo });
                router.push('/chat');
            }}
        />
    );
}
