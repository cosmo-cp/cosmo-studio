import type { StateCreator } from 'zustand';
import type { AppStoreState } from './store';

export interface UiToast {
    id: string;
    type: 'success' | 'error';
    description: string;
}

export interface UiFeedbackState {
    queue: UiToast[];
}

export interface UiFeedbackSlice extends UiFeedbackState {
    enqueueToast: (payload: Omit<UiToast, 'id'>) => void;
    dequeueToast: (toastId: string) => void;
}

export const createInitialUiFeedbackState = (): UiFeedbackState => ({
    queue: [],
});

// Queue toast payloads so the UI can render them in one place.
export const createUiFeedbackSlice: StateCreator<AppStoreState, [], [], UiFeedbackSlice> = (set) => ({
    ...createInitialUiFeedbackState(),
    enqueueToast: (payload) => {
        set((state) => ({
            queue: [
                ...state.queue,
                {
                    id: crypto.randomUUID(),
                    ...payload,
                },
            ],
        }));
    },
    dequeueToast: (toastId) => {
        set((state) => ({
            queue: state.queue.filter((toast) => toast.id !== toastId),
        }));
    },
});
