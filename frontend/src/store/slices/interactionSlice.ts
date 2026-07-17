import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Interaction {
  id: number;
  doctor_name: string;
  hospital: string;
  specialization: string;
  interaction_date: string;
  interaction_type: string;
  products_discussed: string[];
  notes: string;
  summary?: string;
  sentiment?: string;
  interest_level: string;
  follow_up_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface InteractionState {
  list: Interaction[];
  current: Interaction | null;
  loading: boolean;
  error: string | null;
}

const initialState: InteractionState = {
  list: [],
  current: null,
  loading: false,
  error: null,
};

export const fetchInteractions = createAsyncThunk(
  'interactions/fetchAll',
  async (search: string | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get<Interaction[]>('/api/interactions', {
        params: search ? { search } : {},
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch interactions');
    }
  }
);

export const fetchInteractionById = createAsyncThunk(
  'interactions/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.get<Interaction>(`/api/interactions/${id}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch interaction details');
    }
  }
);

export const createInteraction = createAsyncThunk(
  'interactions/create',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post<Interaction>('/api/interactions', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to log interaction');
    }
  }
);

export const updateInteraction = createAsyncThunk(
  'interactions/update',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put<Interaction>(`/api/interactions/${id}`, data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update interaction');
    }
  }
);

export const deleteInteraction = createAsyncThunk(
  'interactions/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/api/interactions/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete interaction');
    }
  }
);

const interactionSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    clearCurrentInteraction(state) {
      state.current = null;
    }
  },
  extraReducers: (builder) => {
    // fetchAll
    builder.addCase(fetchInteractions.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchInteractions.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchInteractions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchById
    builder.addCase(fetchInteractionById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchInteractionById.fulfilled, (state, action) => {
      state.loading = false;
      state.current = action.payload;
    });
    builder.addCase(fetchInteractionById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // create
    builder.addCase(createInteraction.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createInteraction.fulfilled, (state, action) => {
      state.loading = false;
      state.list.unshift(action.payload);
    });
    builder.addCase(createInteraction.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // update
    builder.addCase(updateInteraction.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateInteraction.fulfilled, (state, action) => {
      state.loading = false;
      state.current = action.payload;
      const idx = state.list.findIndex(item => item.id === action.payload.id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
    });
    builder.addCase(updateInteraction.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // delete
    builder.addCase(deleteInteraction.fulfilled, (state, action) => {
      state.list = state.list.filter(item => item.id !== action.payload);
    });
  },
});

export const { clearCurrentInteraction } = interactionSlice.actions;
export default interactionSlice.reducer;
