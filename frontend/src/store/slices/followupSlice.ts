import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface FollowUp {
  id: number;
  interaction_id: number;
  follow_up_date: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface FollowUpState {
  list: FollowUp[];
  loading: boolean;
  error: string | null;
}

const initialState: FollowUpState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchFollowUps = createAsyncThunk(
  'followups/fetchAll',
  async (statusFilter: string | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get<FollowUp[]>('/api/followups', {
        params: statusFilter ? { status_filter: statusFilter } : {},
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch follow-ups');
    }
  }
);

export const createFollowUp = createAsyncThunk(
  'followups/create',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post<FollowUp>('/api/followups', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create follow-up');
    }
  }
);

export const updateFollowUpStatus = createAsyncThunk(
  'followups/updateStatus',
  async ({ id, status, notes }: { id: number; status: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await api.put<FollowUp>(`/api/followups/${id}`, { status, notes });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update follow-up status');
    }
  }
);

const followupSlice = createSlice({
  name: 'followups',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // fetchAll
    builder.addCase(fetchFollowUps.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFollowUps.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchFollowUps.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // create
    builder.addCase(createFollowUp.fulfilled, (state, action) => {
      state.list.push(action.payload);
    });

    // updateStatus
    builder.addCase(updateFollowUpStatus.fulfilled, (state, action) => {
      const idx = state.list.findIndex(item => item.id === action.payload.id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
    });
  },
});

export default followupSlice.reducer;
