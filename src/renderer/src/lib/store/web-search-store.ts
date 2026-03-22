import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import type {
    WebSearchConfigSaveInput,
    WebSearchConfigView,
} from "core/dto";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import type {AsyncStatus} from "@/lib/store/async-status";
import type {AppThunkExtra} from "@/lib/store/store";

export interface WebSearchState {
    config: WebSearchConfigView | null;
    status: AsyncStatus;
    errorMessage: string | null;
}

const initialState: WebSearchState = {
    config: null,
    status: "idle",
    errorMessage: null,
};

const createWebSearchAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

export const loadWebSearchConfig = createWebSearchAsyncThunk<WebSearchConfigView | null, void>(
    "webSearch/load",
    async (_, {extra, rejectWithValue}) => {
        try {
            return await extra.appDataSource.webSearch.getConfig(WebSearchProviderTypeEnum.EXA);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to load web search settings"));
        }
    }
);

export const saveWebSearchConfig = createWebSearchAsyncThunk<
    WebSearchConfigView,
    WebSearchConfigSaveInput
>("webSearch/save", async (input, {extra, rejectWithValue}) => {
    try {
        return await extra.appDataSource.webSearch.saveConfig(input);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to save web search settings"));
    }
});

export const deleteWebSearchConfig = createWebSearchAsyncThunk<void, void>(
    "webSearch/delete",
    async (_, {extra, rejectWithValue}) => {
        try {
            await extra.appDataSource.webSearch.deleteConfig(WebSearchProviderTypeEnum.EXA);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to remove web search settings"));
        }
    }
);

const webSearchSlice = createSlice({
    name: "webSearch",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadWebSearchConfig.pending, (state) => {
                state.status = "loading";
                state.errorMessage = null;
            })
            .addCase(loadWebSearchConfig.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.config = action.payload;
            })
            .addCase(loadWebSearchConfig.rejected, (state, action) => {
                state.status = "failed";
                state.errorMessage = action.payload ?? "Failed to load web search settings";
            })
            .addCase(saveWebSearchConfig.fulfilled, (state, action) => {
                state.config = action.payload;
                state.errorMessage = null;
            })
            .addCase(saveWebSearchConfig.rejected, (state, action) => {
                state.errorMessage = action.payload ?? "Failed to save web search settings";
            })
            .addCase(deleteWebSearchConfig.fulfilled, (state) => {
                state.config = null;
                state.errorMessage = null;
            })
            .addCase(deleteWebSearchConfig.rejected, (state, action) => {
                state.errorMessage = action.payload ?? "Failed to remove web search settings";
            });
    },
});

export const webSearchReducer = webSearchSlice.reducer;
