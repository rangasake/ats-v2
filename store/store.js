import { configureStore } from '@reduxjs/toolkit';
import orgReducer from './orgSlice';

export const store = configureStore({
  reducer: {
    org: orgReducer,
  },
});