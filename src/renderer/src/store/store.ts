import { configureStore } from '@reduxjs/toolkit';
import { chatErrorMiddleware } from './chat-errors';
import { chatReducer } from './chat-slice';

export const store = configureStore({
    reducer: {
        chat: chatReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(chatErrorMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
