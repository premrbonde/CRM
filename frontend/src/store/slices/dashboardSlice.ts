import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface DailyBrief {
  doctor_name: string;
  hospital: string;
  specialization: string;
  relationship_score: number;
  opportunity_score: string;
  last_visit: string;
  recommended_product: string;
  expected_success: number;
  ai_summary: string;
  reason: string;
}

export interface InsightItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  link_label: string;
}

export interface TodayScheduleItem {
  id: number;
  doctor_name: string;
  hospital: string;
  time: string;
  visit_type: string;
  priority: string;
}

export interface PendingFollowupItem {
  id: number;
  doctor_name: string;
  hospital: string;
  due_date: string;
  priority: string;
  product: string;
  objective: string;
}

export interface HighPriorityHCPItem {
  id: number;
  doctor_name: string;
  hospital: string;
  relationship_score: number;
  trend: string;
  risk: string;
  opportunity_score: string;
}

export interface ProductOpportunity {
  recommended_product: string;
  interest_pct: number;
  doctors_discussing: number;
  expected_conversion: number;
  weekly_trend: number;
  top_region: string;
  opportunity: string;
}

export interface PerformanceSummary {
  today_visits: number;
  completed_visits: number;
  pending_visits: number;
  monthly_target: number;
  achievement_pct: number;
  active_doctors: number;
  interactions_this_week: number;
  followups_pending: number;
}

export interface RecentActivityItem {
  id: number;
  activity_type: string;
  description: string;
  time: string;
}

export interface NotificationItem {
  id: number;
  message: string;
  time: string;
  type: string;
}

export interface DashboardStats {
  daily_brief: DailyBrief;
  insights: InsightItem[];
  schedule: TodayScheduleItem[];
  followups: PendingFollowupItem[];
  high_priority_hcps: HighPriorityHCPItem[];
  product_opportunity: ProductOpportunity;
  performance: PerformanceSummary;
  recent_activities: RecentActivityItem[];
  notifications: NotificationItem[];
}

export interface SearchResultItem {
  id: number;
  title: string;
  subtitle: string;
  type: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
}

interface DashboardState {
  stats: DashboardStats | null;
  searchResults: SearchResultItem[];
  searchLoading: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  searchResults: [],
  searchLoading: false,
  loading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<DashboardStats>('/api/dashboard');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch dashboard metrics');
    }
  }
);

export const searchGlobal = createAsyncThunk(
  'dashboard/searchGlobal',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await api.get<GlobalSearchResponse>('/api/search', {
        params: { q: query }
      });
      return response.data.results;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Search query failed');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
    }
  },
  extraReducers: (builder) => {
    // fetchDashboardStats
    builder.addCase(fetchDashboardStats.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDashboardStats.fulfilled, (state, action) => {
      state.loading = false;
      state.stats = action.payload;
    });
    builder.addCase(fetchDashboardStats.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // searchGlobal
    builder.addCase(searchGlobal.pending, (state) => {
      state.searchLoading = true;
    });
    builder.addCase(searchGlobal.fulfilled, (state, action) => {
      state.searchLoading = false;
      state.searchResults = action.payload;
    });
    builder.addCase(searchGlobal.rejected, (state) => {
      state.searchLoading = false;
    });
  },
});

export const { clearSearchResults } = dashboardSlice.actions;
export default dashboardSlice.reducer;
