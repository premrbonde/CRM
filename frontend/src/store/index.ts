import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import interactionReducer from './slices/interactionSlice';
import doctorReducer from './slices/doctorSlice';
import followupReducer from './slices/followupSlice';
import chatReducer from './slices/chatSlice';
import dashboardReducer from './slices/dashboardSlice';
import calendarReducer from './slices/calendarSlice';
import productReducer from './slices/productSlice';
import systemReducer from './slices/systemSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    interactions: interactionReducer,
    doctors: doctorReducer,
    followups: followupReducer,
    chat: chatReducer,
    dashboard: dashboardReducer,
    calendar: calendarReducer,
    products: productReducer,
    system: systemReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
