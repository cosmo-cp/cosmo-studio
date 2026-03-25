import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import type {
    WebSearchConfigSaveInput,
    WebSearchConfigView,
} from "core/dto";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import type {AsyncStatus} from "@/lib/store/async-status";
import type {AppThunkExtra} from "@/lib/store/store";
import {buildWebSearchOptions, type WebSearchOption} from "@/lib/web-search-options";

export interface WebSearchState {
    config: WebSearchConfigView | null;
    status: AsyncStatus;
    errorMessage: string | null;
    options: WebSearchOption[];
    optionsStatus: AsyncStatus;
    optionsErrorMessage: string | null;
}

const initialState: WebSearchState = {
    config: null,
    status: "idle",
    errorMessage: null,
    options: [],
    optionsStatus: "idle",
    optionsErrorMessage: null,
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

export const loadWebSearchOptions = createWebSearchAsyncThunk<WebSearchOption[], void>(
    "webSearch/loadOptions",
    async (_, {extra, rejectWithValue}) => {
        try {
            return await extra.appDataSource.webSearch.listOptions();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to load web search options"));
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
                state.options = buildWebSearchOptions(action.payload);
            })
            .addCase(loadWebSearchConfig.rejected, (state, action) => {
                state.status = "failed";
                state.errorMessage = action.payload ?? "Failed to load web search settings";
            })
            .addCase(saveWebSearchConfig.fulfilled, (state, action) => {
                state.config = action.payload;
                state.options = buildWebSearchOptions(action.payload);
                state.errorMessage = null;
            })
            .addCase(saveWebSearchConfig.rejected, (state, action) => {
                state.errorMessage = action.payload ?? "Failed to save web search settings";
            })
            .addCase(deleteWebSearchConfig.fulfilled, (state) => {
                state.config = null;
                state.options = buildWebSearchOptions(null);
                state.errorMessage = null;
            })
            .addCase(deleteWebSearchConfig.rejected, (state, action) => {
                state.errorMessage = action.payload ?? "Failed to remove web search settings";
            })
            .addCase(loadWebSearchOptions.pending, (state) => {
                state.optionsStatus = "loading";
                state.optionsErrorMessage = null;
            })
            .addCase(loadWebSearchOptions.fulfilled, (state, action) => {
                state.optionsStatus = "succeeded";
                state.options = action.payload;
            })
            .addCase(loadWebSearchOptions.rejected, (state, action) => {
                state.optionsStatus = "failed";
                state.optionsErrorMessage = action.payload ?? "Failed to load web search options";
            });
    },
});

export const webSearchReducer = webSearchSlice.reducer;
