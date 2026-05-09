import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import type {
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
} from "core/dto";
import type {AsyncStatus} from "@/lib/store/async-status";
import type {AppThunkExtra} from "@/lib/store/store";

export interface CommandsState {
    items: CommandDefinition[];
    status: AsyncStatus;
    errorMessage: string | null;
}

const initialState: CommandsState = {
    items: [],
    status: "idle",
    errorMessage: null,
};

const createCommandsAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

export const loadCommands = createCommandsAsyncThunk<CommandDefinition[], void>(
    "commands/load",
    async (_, {extra, rejectWithValue}) => {
        try {
            return await extra.appDataSource.command.listAll();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to load commands"));
        }
    }
);

export const saveCommand = createCommandsAsyncThunk<
    CommandDefinition,
    {commandId?: string; input: CommandCreateInput}
>("commands/save", async ({commandId, input}, {extra, rejectWithValue}) => {
    try {
        if (commandId) {
            return await extra.appDataSource.command.update(commandId, input);
        }
        return await extra.appDataSource.command.create(input);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to save command"));
    }
});

export const deleteCommand = createCommandsAsyncThunk<string, string>(
    "commands/delete",
    async (commandId, {extra, rejectWithValue}) => {
        try {
            await extra.appDataSource.command.delete(commandId);
            return commandId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to delete command"));
        }
    }
);

export const executeCommand = createCommandsAsyncThunk<CommandExecution, {input: string}>(
    "commands/execute",
    async (input, {extra, rejectWithValue}) => {
        try {
            return await extra.appDataSource.command.execute(input);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to execute command"));
        }
    }
);

const commandsSlice = createSlice({
    name: "commands",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadCommands.pending, (state) => {
                state.status = "loading";
                state.errorMessage = null;
            })
            .addCase(loadCommands.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(loadCommands.rejected, (state, action) => {
                state.status = "failed";
                state.errorMessage = action.payload ?? "Failed to load commands";
            })
            .addCase(saveCommand.fulfilled, (state, action) => {
                const existingIndex = state.items.findIndex((command) => command.id === action.payload.id);
                if (existingIndex >= 0) {
                    state.items[existingIndex] = action.payload;
                } else {
                    state.items.push(action.payload);
                }
            })
            .addCase(deleteCommand.fulfilled, (state, action) => {
                state.items = state.items.filter((command) => command.id !== action.payload);
            });
    },
});

export const commandsReducer = commandsSlice.reducer;
