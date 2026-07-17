import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface SystemConfig {
  id: number;
  engine_mode: string;
  evaluation_mode: boolean;
  production_mode: boolean;
  ai_enabled: boolean;
  active_model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  api_key: string;
  api_status: string;
  last_connection_time: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_length: number;
}

export interface SystemTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface StatusInfo {
  connection_status: string;
  target_provider: string;
  active_model: string;
  response_time: number;
  last_checked: string;
  api_health: string;
}

export interface UsageInfo {
  daily_token_limit: number;
  tokens_used_today: number;
  remaining_tokens: number;
  requests_per_minute: number;
  current_rpm_usage: number;
}

export interface InfoDetails {
  ai_engine_version: string;
  backend_version: string;
  environment: string;
  region: string;
  encryption: string;
  data_retention: string;
  last_updated: string;
}

export interface TestResult {
  status: string;
  response_time: number;
  generated_response: string;
  tool_used: string;
  model_used: string;
}

interface SystemState {
  configuration: SystemConfig | null;
  models: ModelInfo[];
  tools: SystemTool[];
  status: StatusInfo | null;
  usage: UsageInfo | null;
  info: InfoDetails | null;
  testResult: TestResult | null;
  loading: boolean;
  testLoading: boolean;
  validationLoading: boolean;
  saveLoading: boolean;
  error: string | null;
}

const initialState: SystemState = {
  configuration: null,
  models: [],
  tools: [],
  status: null,
  usage: null,
  info: null,
  testResult: null,
  loading: false,
  testLoading: false,
  validationLoading: false,
  saveLoading: false,
  error: null,
};

export const fetchConfiguration = createAsyncThunk(
  'system/fetchConfiguration',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<SystemConfig>('/api/system/configuration');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch AI configurations');
    }
  }
);

export const saveConfiguration = createAsyncThunk(
  'system/saveConfiguration',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.put<SystemConfig>('/api/system/configuration', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to save AI configurations');
    }
  }
);

export const patchConfiguration = createAsyncThunk(
  'system/patchConfiguration',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.patch<SystemConfig>('/api/system/configuration', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to patch configuration');
    }
  }
);

export const fetchModels = createAsyncThunk(
  'system/fetchModels',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ModelInfo[]>('/api/system/models');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch Groq models');
    }
  }
);

export const saveModelSettings = createAsyncThunk(
  'system/saveModelSettings',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.put<SystemConfig>('/api/system/model-settings', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to save model settings');
    }
  }
);

export const fetchTools = createAsyncThunk(
  'system/fetchTools',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<SystemTool[]>('/api/system/tools');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch system tools');
    }
  }
);

export const patchTool = createAsyncThunk(
  'system/patchTool',
  async ({ id, enabled }: { id: string; enabled: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.patch<SystemTool>(`/api/system/tools/${id}`, { enabled });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update system tool');
    }
  }
);

export const updateApiKey = createAsyncThunk(
  'system/updateApiKey',
  async (key: string, { rejectWithValue }) => {
    try {
      const response = await api.post<any>('/api/system/api-key', { api_key: key });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to save API key');
    }
  }
);

export const validateApiKey = createAsyncThunk(
  'system/validateApiKey',
  async (key: string, { rejectWithValue }) => {
    try {
      const response = await api.post<any>('/api/system/validate-key', { api_key: key });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Validation failed. Verify your key.');
    }
  }
);

export const fetchStatus = createAsyncThunk(
  'system/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<StatusInfo>('/api/system/status');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch status');
    }
  }
);

export const fetchUsage = createAsyncThunk(
  'system/fetchUsage',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<UsageInfo>('/api/system/usage');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch usage');
    }
  }
);

export const fetchInfo = createAsyncThunk(
  'system/fetchInfo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<InfoDetails>('/api/system/info');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch info');
    }
  }
);

export const runAIEngineTest = createAsyncThunk(
  'system/runAIEngineTest',
  async ({ tool_id, prompt }: { tool_id: string; prompt: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<TestResult>('/api/system/test', { tool_id, prompt });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'A test run error occurred');
    }
  }
);

export const resetConfiguration = createAsyncThunk(
  'system/resetConfiguration',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post<SystemConfig>('/api/system/reset');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Reset failed');
    }
  }
);

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    clearTestResult: (state) => {
      state.testResult = null;
    }
  },
  extraReducers: (builder) => {
    // fetchConfiguration
    builder.addCase(fetchConfiguration.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchConfiguration.fulfilled, (state, action) => {
      state.loading = false;
      state.configuration = action.payload;
    });
    builder.addCase(fetchConfiguration.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // saveConfiguration
    builder.addCase(saveConfiguration.pending, (state) => {
      state.saveLoading = true;
    });
    builder.addCase(saveConfiguration.fulfilled, (state, action) => {
      state.saveLoading = false;
      state.configuration = action.payload;
    });
    builder.addCase(saveConfiguration.rejected, (state) => {
      state.saveLoading = false;
    });

    // patchConfiguration
    builder.addCase(patchConfiguration.fulfilled, (state, action) => {
      state.configuration = action.payload;
    });

    // fetchModels
    builder.addCase(fetchModels.fulfilled, (state, action) => {
      state.models = action.payload;
    });

    // saveModelSettings
    builder.addCase(saveModelSettings.fulfilled, (state, action) => {
      state.configuration = action.payload;
    });

    // fetchTools
    builder.addCase(fetchTools.fulfilled, (state, action) => {
      state.tools = action.payload;
    });

    // patchTool
    builder.addCase(patchTool.fulfilled, (state, action) => {
      const idx = state.tools.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) {
        state.tools[idx] = action.payload;
      }
    });

    // updateApiKey
    builder.addCase(updateApiKey.fulfilled, (state, action) => {
      if (state.configuration) {
        state.configuration.api_key = action.payload.api_key;
        state.configuration.api_status = action.payload.api_status;
        state.configuration.last_connection_time = action.payload.last_connection_time;
      }
    });

    // validateApiKey
    builder.addCase(validateApiKey.pending, (state) => {
      state.validationLoading = true;
    });
    builder.addCase(validateApiKey.fulfilled, (state, action) => {
      state.validationLoading = false;
      if (state.configuration) {
        state.configuration.api_status = action.payload.api_status;
        state.configuration.last_connection_time = action.payload.last_connection_time;
      }
    });
    builder.addCase(validateApiKey.rejected, (state) => {
      state.validationLoading = false;
    });

    // fetchStatus
    builder.addCase(fetchStatus.fulfilled, (state, action) => {
      state.status = action.payload;
    });

    // fetchUsage
    builder.addCase(fetchUsage.fulfilled, (state, action) => {
      state.usage = action.payload;
    });

    // fetchInfo
    builder.addCase(fetchInfo.fulfilled, (state, action) => {
      state.info = action.payload;
    });

    // runAIEngineTest
    builder.addCase(runAIEngineTest.pending, (state) => {
      state.testLoading = true;
    });
    builder.addCase(runAIEngineTest.fulfilled, (state, action) => {
      state.testLoading = false;
      state.testResult = action.payload;
    });
    builder.addCase(runAIEngineTest.rejected, (state) => {
      state.testLoading = false;
    });

    // resetConfiguration
    builder.addCase(resetConfiguration.fulfilled, (state, action) => {
      state.configuration = action.payload;
    });
  },
});

export const { clearTestResult } = systemSlice.actions;
export default systemSlice.reducer;
