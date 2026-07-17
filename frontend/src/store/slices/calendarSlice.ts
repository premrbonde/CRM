import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface CalendarEvent {
  id: number;
  interaction_id: number;
  doctor_name: string;
  hospital: string;
  visit_date: string;
  visit_time: string;
  visit_type: string;
  agenda: string;
  priority: string;
  status: string;
  product_focus: string[];
  color: string;
}

export interface CalendarSummary {
  total_visits: number;
  completed_visits: number;
  upcoming_visits: number;
  this_week: number;
  next_week: number;
  overdue_followups: number;
}

export interface RouteOptimization {
  efficiency_score: number;
  travel_time_saved: number;
  distance_saved: number;
  visits_optimized: number;
}

interface CalendarState {
  events: CalendarEvent[];
  upcoming: CalendarEvent[];
  summary: CalendarSummary | null;
  routeOptimization: RouteOptimization | null;
  loading: boolean;
  nbaLoading: boolean;
  error: string | null;
}

const initialState: CalendarState = {
  events: [],
  upcoming: [],
  summary: null,
  routeOptimization: null,
  loading: false,
  nbaLoading: false,
  error: null,
};

export const fetchEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async ({ month, year }: { month?: number; year?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get<CalendarEvent[]>('/api/calendar/events', {
        params: month && year ? { month, year } : {},
      });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch calendar events');
    }
  }
);

export const fetchUpcoming = createAsyncThunk(
  'calendar/fetchUpcoming',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CalendarEvent[]>('/api/calendar/upcoming');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch upcoming visits');
    }
  }
);

export const fetchSummary = createAsyncThunk(
  'calendar/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CalendarSummary>('/api/calendar/summary');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch calendar summary');
    }
  }
);

export const fetchRouteOptimization = createAsyncThunk(
  'calendar/fetchRouteOptimization',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<RouteOptimization>('/api/calendar/route-optimization');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch route optimization');
    }
  }
);

export const optimizeRoutes = createAsyncThunk(
  'calendar/optimizeRoutes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post<RouteOptimization>('/api/calendar/optimize-routes');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to optimize routes');
    }
  }
);

export const createEvent = createAsyncThunk(
  'calendar/createEvent',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post<CalendarEvent>('/api/calendar/events', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create calendar event');
    }
  }
);

export const updateEvent = createAsyncThunk(
  'calendar/updateEvent',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.put<CalendarEvent>(`/api/calendar/events/${id}`, data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update calendar event');
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/api/calendar/events/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete calendar event');
    }
  }
);

export const completeEvent = createAsyncThunk(
  'calendar/completeEvent',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.patch<CalendarEvent>(`/api/calendar/events/${id}/complete`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to complete visit event');
    }
  }
);

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // fetchEvents
    builder.addCase(fetchEvents.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      state.loading = false;
      state.events = action.payload;
    });
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchUpcoming
    builder.addCase(fetchUpcoming.fulfilled, (state, action) => {
      state.upcoming = action.payload;
    });

    // fetchSummary
    builder.addCase(fetchSummary.fulfilled, (state, action) => {
      state.summary = action.payload;
    });

    // fetchRouteOptimization
    builder.addCase(fetchRouteOptimization.fulfilled, (state, action) => {
      state.routeOptimization = action.payload;
    });

    // optimizeRoutes
    builder.addCase(optimizeRoutes.pending, (state) => {
      state.nbaLoading = true;
    });
    builder.addCase(optimizeRoutes.fulfilled, (state, action) => {
      state.nbaLoading = false;
      state.routeOptimization = action.payload;
    });
    builder.addCase(optimizeRoutes.rejected, (state) => {
      state.nbaLoading = false;
    });

    // createEvent
    builder.addCase(createEvent.fulfilled, (state, action) => {
      state.events.push(action.payload);
      state.upcoming.push(action.payload);
      // Sort upcoming by date asc
      state.upcoming.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    });

    // updateEvent
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const idx = state.events.findIndex(e => e.id === action.payload.id);
      if (idx !== -1) {
        state.events[idx] = action.payload;
      }
      const uIdx = state.upcoming.findIndex(e => e.id === action.payload.id);
      if (uIdx !== -1) {
        state.upcoming[uIdx] = action.payload;
      }
    });

    // deleteEvent
    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.events = state.events.filter(e => e.id !== action.payload);
      state.upcoming = state.upcoming.filter(e => e.id !== action.payload);
    });

    // completeEvent
    builder.addCase(completeEvent.fulfilled, (state, action) => {
      const idx = state.events.findIndex(e => e.id === action.payload.id);
      if (idx !== -1) {
        state.events[idx] = action.payload;
      }
      state.upcoming = state.upcoming.filter(e => e.id !== action.payload.id);
    });
  },
});

export default calendarSlice.reducer;
