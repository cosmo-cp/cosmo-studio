import { StoreContext } from '@/app/store-provider';
import { ProfilePageContent } from '@/components/profile-page-content';
import { createAppStore } from '@/lib/store/store';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';

describe('ProfilePageContent', () => {
    it('renders profile title, photo upload controls, and name input with current profile data', async () => {
        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: 'Jane Doe',
                        initials: 'JD',
                        photo: null,
                        isConfigured: true,
                    }),
                },
            }),
        );

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <ProfilePageContent />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
        expect(screen.getByText('Profile Photo')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument();

        const input = await screen.findByRole('textbox', { name: /display name/i });
        expect(input).toHaveValue('Jane Doe');
    });

    it('submits updated name and photo, showing toast feedback', async () => {
        const user = userEvent.setup();
        const saveProfileSpy = vi.fn().mockResolvedValue({
            name: 'Jane Smith',
            initials: 'JS',
            photo: 'data:image/png;base64,mockphoto',
            isConfigured: true,
        });

        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: 'Jane Doe',
                        initials: 'JD',
                        photo: null,
                        isConfigured: true,
                    }),
                    saveProfile: saveProfileSpy,
                },
            }),
        );
        const toastSpy = vi.spyOn(store.getState(), 'enqueueToast');

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <ProfilePageContent />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        const input = await screen.findByRole('textbox', { name: /display name/i });
        expect(input).toHaveValue('Jane Doe');
        await user.clear(input);
        await user.type(input, 'Jane Smith');

        const submitButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(saveProfileSpy).toHaveBeenCalledWith({
                name: 'Jane Smith',
                photo: null,
            });
            expect(toastSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'success',
                    description: 'Profile updated successfully.',
                }),
            );
        });
    });

    it('handles image upload and removal', async () => {
        const user = userEvent.setup();
        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: 'Jane Doe',
                        initials: 'JD',
                        photo: 'data:image/png;base64,existingphoto',
                        isConfigured: true,
                    }),
                },
            }),
        );

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <ProfilePageContent />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        // Check existing photo is rendered
        const existingImg = await screen.findByRole('img', { name: /profile photo/i });
        expect(existingImg).toHaveAttribute('src', 'data:image/png;base64,existingphoto');

        // Click remove photo
        const removeButton = screen.getByRole('button', { name: /remove/i });
        await user.click(removeButton);

        // Photo should be removed and initials displayed
        expect(screen.queryByRole('img', { name: /profile photo/i })).not.toBeInTheDocument();
        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('shows error when selecting non-image or file exceeding 5MB', async () => {
        const store = createAppStore(createMockAppDataSource());

        const { container } = render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <ProfilePageContent />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        await screen.findByRole('heading', { name: 'Profile' });
        const fileInput = container.querySelector('#profile-photo-upload') as HTMLInputElement;
        expect(fileInput).toBeInTheDocument();

        // Test non-image file
        const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [textFile] } });
        expect(screen.getByText('Please select a valid image file.')).toBeInTheDocument();

        // Test oversized file > 5MB
        const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
        expect(screen.getByText('Image size exceeds 5MB limit.')).toBeInTheDocument();
    });
});
