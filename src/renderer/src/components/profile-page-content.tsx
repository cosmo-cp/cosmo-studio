'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSaveUserProfileMutation, useUserProfileQuery } from '@/features/user/user-api';
import { Camera, Check, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface ProfileFormProps {
    defaultName: string;
    defaultPhoto: string | null;
    initials: string;
    isPending: boolean;
    onSave: (name: string, photo: string | null) => Promise<void>;
}

function ProfileForm({ defaultName, defaultPhoto, initials, isPending, onSave }: ProfileFormProps) {
    const [name, setName] = useState(defaultName);
    const [photo, setPhoto] = useState<string | null>(defaultPhoto);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setPhotoError('Please select a valid image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('Image size exceeds 5MB limit.');
            return;
        }

        setPhotoError(null);
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                setPhoto(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhoto(null);
        setPhotoError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || isPending) return;

        try {
            await onSave(trimmed, photo);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    const displayInitials = initials || (name.trim() ? name.trim().slice(0, 2).toUpperCase() : 'GA');

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-6 md:p-10">
            <div className="mx-auto w-full max-w-2xl flex flex-col gap-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Profile</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your display name and photo for Cosmo Studio.
                    </p>
                </div>

                {/* Form Card */}
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-2xs"
                >
                    {/* Photo Section */}
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-semibold text-foreground">Profile Photo</label>
                        <div className="flex items-center gap-5">
                            <div className="size-20 shrink-0 rounded-full border-2 border-border/60 bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-xs overflow-hidden">
                                {photo ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={photo} alt="Profile photo" className="size-full object-cover" />
                                ) : (
                                    <span>{displayInitials}</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        id="profile-photo-upload"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-9 gap-1.5 cursor-pointer rounded-xl font-medium"
                                    >
                                        <Camera className="size-3.5" />
                                        <span>Upload photo</span>
                                    </Button>

                                    {photo && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemovePhoto}
                                            className="h-9 gap-1.5 text-destructive hover:text-destructive cursor-pointer rounded-xl font-medium"
                                        >
                                            <Trash2 className="size-3.5" />
                                            <span>Remove</span>
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Square JPG, PNG, WebP or GIF. Max 5MB.</p>
                                {photoError && <p className="text-xs font-medium text-destructive">{photoError}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border/40" />

                    {/* Name Section */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="display-name" className="text-sm font-semibold text-foreground">
                            Display Name
                        </label>
                        <Input
                            id="display-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            required
                            disabled={isPending}
                            className="h-10 rounded-xl px-3 text-sm bg-muted/30 border border-border/60 focus-visible:bg-background"
                        />
                        <p className="text-xs text-muted-foreground">
                            This name will be displayed in the sidebar, chat messages, and task comments.
                        </p>
                    </div>

                    <div className="h-px bg-border/40" />

                    {/* Save Button */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={!name.trim() || isPending}
                            className="h-10 min-w-32 rounded-xl gap-2 font-medium cursor-pointer"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : isSaved ? (
                                <>
                                    <Check className="size-4 text-emerald-400" />
                                    <span>Saved</span>
                                </>
                            ) : (
                                <span>Save changes</span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Profile page component providing a form to edit user name and photo.
 */
export function ProfilePageContent() {
    const { user, isLoading } = useUserProfileQuery();
    const { saveProfile, isPending } = useSaveUserProfileMutation();

    if (isLoading && !user) {
        return (
            <div className="flex h-full w-full items-center justify-center p-6">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <ProfileForm
            key={user?.name ? `${user.name}-${user.photo ?? ''}` : 'empty'}
            defaultName={user?.name || ''}
            defaultPhoto={user?.photo || null}
            initials={user?.initials || 'GA'}
            isPending={isPending}
            onSave={async (name, photo) => {
                await saveProfile({ name, photo });
            }}
        />
    );
}
