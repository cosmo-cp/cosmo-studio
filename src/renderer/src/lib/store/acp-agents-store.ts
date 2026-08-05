import type { AsyncStatus } from '@/lib/store/async-status';
import type { AppThunkExtra } from '@/lib/store/store';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
    AcpAgentCreateInput,
    AcpAgentTestResult,
    AcpAgentUpdateInput,
    AcpAgentView,
    AcpRegistryInstallInput,
    AcpRegistryView,
} from 'core/dto';

export interface AcpAgentsState {
    items: AcpAgentView[];
    registry: AcpRegistryView | null;
    status: AsyncStatus;
    registryStatus: AsyncStatus;
    errorMessage: string | null;
    registryErrorMessage: string | null;
}

const initialState: AcpAgentsState = {
    items: [],
    registry: null,
    status: 'idle',
    registryStatus: 'idle',
    errorMessage: null,
    registryErrorMessage: null,
};

const createAcpAgentsAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

function upsertAgent(agents: AcpAgentView[], updated: AcpAgentView) {
    const existingIndex = agents.findIndex((agent) => agent.id === updated.id);
    if (existingIndex >= 0) {
        agents[existingIndex] = updated;
        return;
    }
    agents.push(updated);
}

export const loadAcpAgents = createAcpAgentsAsyncThunk<AcpAgentView[], void>(
    'acpAgents/load',
    async (_, { extra, rejectWithValue }) => {
        try {
            return await extra.appDataSource.acpAgent.getAll();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to load ACP agents'));
        }
    },
);

export const saveAcpAgent = createAcpAgentsAsyncThunk<
    AcpAgentView,
    { agentId?: string; input: AcpAgentCreateInput | AcpAgentUpdateInput }
>('acpAgents/save', async ({ agentId, input }, { extra, rejectWithValue }) => {
    try {
        if (agentId) {
            return await extra.appDataSource.acpAgent.update(agentId, input);
        }
        return await extra.appDataSource.acpAgent.create(input as AcpAgentCreateInput);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Failed to save ACP agent'));
    }
});

export const deleteAcpAgent = createAcpAgentsAsyncThunk<string, string>(
    'acpAgents/delete',
    async (agentId, { extra, rejectWithValue }) => {
        try {
            await extra.appDataSource.acpAgent.delete(agentId);
            return agentId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to delete ACP agent'));
        }
    },
);

export const toggleAcpAgentEnabled = createAcpAgentsAsyncThunk<AcpAgentView, { agentId: string; enabled: boolean }>(
    'acpAgents/toggleEnabled',
    async ({ agentId, enabled }, { extra, rejectWithValue }) => {
        try {
            return enabled
                ? await extra.appDataSource.acpAgent.enable(agentId)
                : await extra.appDataSource.acpAgent.disable(agentId);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to toggle ACP agent'));
        }
    },
);

export const loadAcpRegistry = createAcpAgentsAsyncThunk<AcpRegistryView, { refresh?: boolean } | void>(
    'acpAgents/loadRegistry',
    async (input, { extra, rejectWithValue }) => {
        try {
            return input?.refresh
                ? await extra.appDataSource.acpAgent.refreshRegistry()
                : await extra.appDataSource.acpAgent.getRegistry();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to load ACP registry'));
        }
    },
);

export const installAcpAgentFromRegistry = createAcpAgentsAsyncThunk<AcpAgentView, AcpRegistryInstallInput>(
    'acpAgents/installFromRegistry',
    async (input, { extra, rejectWithValue }) => {
        try {
            return await extra.appDataSource.acpAgent.installFromRegistry(input);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to install ACP agent'));
        }
    },
);

export const testAcpAgent = createAcpAgentsAsyncThunk<AcpAgentTestResult, { agentId: string; cwd?: string | null }>(
    'acpAgents/test',
    async ({ agentId, cwd }, { extra, rejectWithValue }) => {
        try {
            return await extra.appDataSource.acpAgent.test(agentId, cwd ?? null);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Failed to test ACP agent'));
        }
    },
);

const acpAgentsSlice = createSlice({
    name: 'acpAgents',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadAcpAgents.pending, (state) => {
                state.status = 'loading';
                state.errorMessage = null;
            })
            .addCase(loadAcpAgents.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(loadAcpAgents.rejected, (state, action) => {
                state.status = 'failed';
                state.errorMessage = action.payload ?? 'Failed to load ACP agents';
            })
            .addCase(saveAcpAgent.fulfilled, (state, action) => {
                upsertAgent(state.items, action.payload);
            })
            .addCase(deleteAcpAgent.fulfilled, (state, action) => {
                state.items = state.items.filter((agent) => agent.id !== action.payload);
            })
            .addCase(toggleAcpAgentEnabled.fulfilled, (state, action) => {
                upsertAgent(state.items, action.payload);
            })
            .addCase(installAcpAgentFromRegistry.fulfilled, (state, action) => {
                upsertAgent(state.items, action.payload);
            })
            .addCase(loadAcpRegistry.pending, (state) => {
                state.registryStatus = 'loading';
                state.registryErrorMessage = null;
            })
            .addCase(loadAcpRegistry.fulfilled, (state, action) => {
                state.registryStatus = 'succeeded';
                state.registry = action.payload;
            })
            .addCase(loadAcpRegistry.rejected, (state, action) => {
                state.registryStatus = 'failed';
                state.registryErrorMessage = action.payload ?? 'Failed to load ACP registry';
            });
    },
});

export const acpAgentsReducer = acpAgentsSlice.reducer;
