import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  hospital: string;
  city: string;
  email?: string;
  phone?: string;
  relationship_score: number;
  sales_opportunity: string;
  risk_level: string;
  ai_summary?: string;
  next_best_action?: string;
}

export interface DoctorProfileResponse {
  profile: Doctor;
  history: any[];
  relationship_intelligence?: any;
  next_best_action?: any;
}

interface DoctorState {
  list: Doctor[];
  currentProfile: DoctorProfileResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: DoctorState = {
  list: [],
  currentProfile: null,
  loading: false,
  error: null,
};

export const fetchDoctors = createAsyncThunk(
  'doctors/fetchAll',
  async (search: string | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get<Doctor[]>('/api/hcps', {
        params: search ? { search } : {},
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch doctors list');
    }
  }
);

export const fetchDoctorProfile = createAsyncThunk(
  'doctors/fetchProfile',
  async (id: number, { rejectWithValue }) => {
    try {
      const [profileRes, historyRes, summaryRes, nbaRes] = await Promise.all([
        api.get<Doctor>(`/api/hcps/${id}`),
        api.get<any[]>(`/api/hcps/${id}/interaction-history`),
        api.get<any>(`/api/hcps/${id}/relationship-summary`),
        api.get<any>(`/api/hcps/${id}/next-best-actions`)
      ]);

      return {
        profile: profileRes.data,
        history: historyRes.data,
        relationship_intelligence: summaryRes.data,
        next_best_action: nbaRes.data
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch doctor profile');
    }
  }
);

export const createDoctor = createAsyncThunk(
  'doctors/create',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post<Doctor>('/api/hcps', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to add doctor');
    }
  }
);

export const updateDoctor = createAsyncThunk(
  'doctors/update',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put<Doctor>(`/api/hcps/${id}`, data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update doctor');
    }
  }
);

export const deleteDoctor = createAsyncThunk(
  'doctors/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/api/hcps/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete doctor');
    }
  }
);

const doctorSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {
    clearCurrentProfile(state) {
      state.currentProfile = null;
    }
  },
  extraReducers: (builder) => {
    // fetchAll
    builder.addCase(fetchDoctors.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDoctors.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchDoctors.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchProfile
    builder.addCase(fetchDoctorProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDoctorProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.currentProfile = action.payload;
    });
    builder.addCase(fetchDoctorProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // create
    builder.addCase(createDoctor.fulfilled, (state, action) => {
      state.list.push(action.payload);
    });

    // update
    builder.addCase(updateDoctor.fulfilled, (state, action) => {
      const idx = state.list.findIndex(doc => doc.id === action.payload.id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
      if (state.currentProfile && state.currentProfile.profile.id === action.payload.id) {
        state.currentProfile.profile = action.payload;
      }
    });

    // delete
    builder.addCase(deleteDoctor.fulfilled, (state, action) => {
      state.list = state.list.filter(doc => doc.id !== action.payload);
      if (state.currentProfile && state.currentProfile.profile.id === action.payload) {
        state.currentProfile = null;
      }
    });
  },
});

export const { clearCurrentProfile } = doctorSlice.actions;
export default doctorSlice.reducer;
