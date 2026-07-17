import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  extractedData?: any;
  toolTriggered?: string;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  lastExtractedData: any | null;
  lastToolTriggered: string | null;
}

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      sender: 'agent',
      text: "Hello! I am your AI CRM Assistant. You can describe your doctor interactions here in plain English (e.g., 'I met Dr. Sharma today at Apollo Hospital. Discussed CardioPlus. Interest level was high, schedule a follow-up for next Monday'), and I will automatically extract the details, log the meeting, and configure the calendar reminders. How can I help you today?",
      timestamp: new Date().toLocaleTimeString(),
    }
  ],
  loading: false,
  error: null,
  lastExtractedData: null,
  lastToolTriggered: null,
};

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/langgraph', { message });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to communicate with AI Assistant');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addManualMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    clearChat(state) {
      state.messages = [initialState.messages[0]];
      state.lastExtractedData = null;
      state.lastToolTriggered = null;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(sendChatMessage.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendChatMessage.fulfilled, (state, action) => {
      state.loading = false;
      const { response, extracted_data, tool_triggered } = action.payload;
      
      state.lastExtractedData = extracted_data || null;
      state.lastToolTriggered = tool_triggered || null;

      state.messages.push({
        id: Math.random().toString(36).substring(7),
        sender: 'agent',
        text: response,
        timestamp: new Date().toLocaleTimeString(),
        extractedData: extracted_data,
        toolTriggered: tool_triggered,
      });
    });
    builder.addCase(sendChatMessage.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      
      state.messages.push({
        id: Math.random().toString(36).substring(7),
        sender: 'agent',
        text: `Sorry, I encountered an error: ${action.payload as string}. Please try again.`,
        timestamp: new Date().toLocaleTimeString(),
      });
    });
  },
});

export const { addManualMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
