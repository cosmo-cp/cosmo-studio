import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import type {Persona, PersonaCreateInput} from "core/dto";
import type {AsyncStatus} from "@/lib/store/async-status";
import type {AppThunkExtra} from "@/lib/store/store";

export interface PersonasState {
    items: Persona[];
    status: AsyncStatus;
    errorMessage: string | null;
}

const initialState: PersonasState = {
    items: [],
    status: "idle",
    errorMessage: null,
};

const createPersonasAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

export const loadPersonas = createPersonasAsyncThunk<Persona[], void>(
    "personas/load",
    async (_, {extra, rejectWithValue}) => {
        try {
            return await extra.appDataSource.persona.getAll();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to load personas"));
        }
    }
);

export const savePersona = createPersonasAsyncThunk<
    Persona,
    {personaId?: string; input: PersonaCreateInput}
>("personas/save", async ({personaId, input}, {extra, rejectWithValue}) => {
    try {
        if (personaId) {
            return await extra.appDataSource.persona.update(personaId, input);
        }
        return await extra.appDataSource.persona.create(input);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to save persona"));
    }
});

export const deletePersona = createPersonasAsyncThunk<string, string>(
    "personas/delete",
    async (personaId, {extra, rejectWithValue}) => {
        try {
            await extra.appDataSource.persona.delete(personaId);
            return personaId;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to delete persona"));
        }
    }
);

const personasSlice = createSlice({
    name: "personas",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadPersonas.pending, (state) => {
                state.status = "loading";
                state.errorMessage = null;
            })
            .addCase(loadPersonas.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(loadPersonas.rejected, (state, action) => {
                state.status = "failed";
                state.errorMessage = action.payload ?? "Failed to load personas";
            })
            .addCase(savePersona.fulfilled, (state, action) => {
                const existingIndex = state.items.findIndex((persona) => persona.id === action.payload.id);
                if (existingIndex >= 0) {
                    state.items[existingIndex] = action.payload;
                } else {
                    state.items.push(action.payload);
                }
            })
            .addCase(deletePersona.fulfilled, (state, action) => {
                state.items = state.items.filter((persona) => persona.id !== action.payload);
            });
    },
});

export const personasReducer = personasSlice.reducer;
