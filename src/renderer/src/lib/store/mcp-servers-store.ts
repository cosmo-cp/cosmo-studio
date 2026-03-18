import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import type {
    McpServer,
    McpServerCreateInput,
} from "core/dto";
import type {McpTool} from "@/lib/app-data-source";
import type {AsyncStatus} from "@/lib/store/async-status";
import type {AppThunkExtra} from "@/lib/store/store";

export interface McpServersState {
    items: McpServer[];
    status: AsyncStatus;
    errorMessage: string | null;
}

const initialState: McpServersState = {
    items: [],
    status: "idle",
    errorMessage: null,
};

const createMcpServersAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

function upsertServer(servers: McpServer[], updated: McpServer) {
    const existingIndex = servers.findIndex((server) => server.id === updated.id);
    if (existingIndex >= 0) {
        servers[existingIndex] = updated;
        return;
    }
    servers.push(updated);
}

export const loadMcpServers = createMcpServersAsyncThunk<McpServer[], void>(
    "mcpServers/load",
    async (_, {extra, rejectWithValue}) => {
        try {
            return await extra.appDataSource.mcpServer.getAll();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to load MCP servers"));
        }
    }
);

export const saveMcpServer = createMcpServersAsyncThunk<
    McpServer,
    {serverId?: string; input: McpServerCreateInput}
>("mcpServers/save", async ({serverId, input}, {extra, rejectWithValue}) => {
    try {
        if (serverId) {
            return await extra.appDataSource.mcpServer.update(serverId, input);
        }
        return await extra.appDataSource.mcpServer.create(input);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to save MCP server"));
    }
});

export const deleteMcpServer = createMcpServersAsyncThunk<string, string>(
    "mcpServers/delete",
    async (serverId, {extra, rejectWithValue}) => {
        try {
            await extra.appDataSource.mcpServer.delete(serverId);
            return serverId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to delete MCP server"));
        }
    }
);

export const toggleMcpServerEnabled = createMcpServersAsyncThunk<
    McpServer,
    {serverId: string; enabled: boolean}
>("mcpServers/toggleEnabled", async ({serverId, enabled}, {extra, rejectWithValue}) => {
    try {
        if (enabled) {
            return await extra.appDataSource.mcpServer.enable(serverId);
        }
        return await extra.appDataSource.mcpServer.disable(serverId);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to toggle server"));
    }
});

export const loadMcpServerTools = createMcpServersAsyncThunk<
    {serverId: string; tools: McpTool[]},
    string
>("mcpServers/loadTools", async (serverId, {extra, rejectWithValue}) => {
    try {
        const tools = await extra.appDataSource.mcpServer.getServerTools(serverId);
        return {serverId, tools};
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to load tools"));
    }
});

export const updateMcpToolApproval = createMcpServersAsyncThunk<
    McpServer,
    {serverId: string; toolName: string; needsApproval: boolean}
>("mcpServers/updateToolApproval", async (input, {extra, rejectWithValue}) => {
    try {
        return await extra.appDataSource.mcpServer.updateToolApproval(
            input.serverId,
            input.toolName,
            input.needsApproval
        );
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to update tool approval"));
    }
});

const mcpServersSlice = createSlice({
    name: "mcpServers",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadMcpServers.pending, (state) => {
                state.status = "loading";
                state.errorMessage = null;
            })
            .addCase(loadMcpServers.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(loadMcpServers.rejected, (state, action) => {
                state.status = "failed";
                state.errorMessage = action.payload ?? "Failed to load MCP servers";
            })
            .addCase(saveMcpServer.fulfilled, (state, action) => {
                upsertServer(state.items, action.payload);
            })
            .addCase(deleteMcpServer.fulfilled, (state, action) => {
                state.items = state.items.filter((server) => server.id !== action.payload);
            })
            .addCase(toggleMcpServerEnabled.fulfilled, (state, action) => {
                upsertServer(state.items, action.payload);
            })
            .addCase(updateMcpToolApproval.fulfilled, (state, action) => {
                upsertServer(state.items, action.payload);
            });
    },
});

export const mcpServersReducer = mcpServersSlice.reducer;
