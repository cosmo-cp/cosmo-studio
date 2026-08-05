import type { AsyncStatus } from '@/lib/store/async-status';
import type { AppThunkExtra } from '@/lib/store/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ModelProviderCreateInput, NewModel, ProviderWithModels } from 'core/dto';

export interface ProvidersState {
    items: ProviderWithModels[];
    status: AsyncStatus;
    errorMessage: string | null;
}

const initialState: ProvidersState = {
    items: [],
    status: 'idle',
    errorMessage: null,
};

const createProvidersAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

export const loadProviders = createProvidersAsyncThunk<ProviderWithModels[], void>(
    'providers/load',
    async (_, { extra, rejectWithValue }) => {
        try {
            return await extra.appDataSource.modelProvider.getProvidersWithModels();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to load providers'));
        }
    },
);

export const loadAvailableModelsForProvider = createProvidersAsyncThunk<NewModel[], ModelProviderCreateInput>(
    'providers/loadAvailableModels',
    async (provider, { extra, rejectWithValue }) => {
        try {
            return await extra.appDataSource.modelProvider.getAvailableModelsFromProviders(provider);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to load models for this provider'));
        }
    },
);

export const saveProvider = createProvidersAsyncThunk<
    ProviderWithModels,
    { providerId?: string; providerData: ModelProviderCreateInput; models: NewModel[] }
>('providers/save', async ({ providerId, providerData, models }, { extra, rejectWithValue }) => {
    try {
        if (providerId) {
            return await extra.appDataSource.modelProvider.updateProvider(providerId, providerData, models);
        }
        return await extra.appDataSource.modelProvider.addProvider(providerData, models);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Failed to save provider'));
    }
});

export const deleteProvider = createProvidersAsyncThunk<string, string>(
    'providers/delete',
    async (providerId, { extra, rejectWithValue }) => {
        try {
            await extra.appDataSource.modelProvider.deleteProvider(providerId);
            return providerId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete provider'));
        }
    },
);

const providersSlice = createSlice({
    name: 'providers',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadProviders.pending, (state) => {
                state.status = 'loading';
                state.errorMessage = null;
            })
            .addCase(loadProviders.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(loadProviders.rejected, (state, action) => {
                state.status = 'failed';
                state.errorMessage = action.payload ?? 'Failed to load providers';
            })
            .addCase(saveProvider.fulfilled, (state, action) => {
                const existingIndex = state.items.findIndex((provider) => provider.id === action.payload.id);
                if (existingIndex >= 0) {
                    state.items[existingIndex] = action.payload;
                } else {
                    state.items.push(action.payload);
                }
            })
            .addCase(deleteProvider.fulfilled, (state, action) => {
                state.items = state.items.filter((provider) => provider.id !== action.payload);
            });
    },
});

export const providersReducer = providersSlice.reducer;
