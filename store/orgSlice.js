import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  org: null,
  loading: true,
  error: null,
};

const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {
    setOrg: (state, action) => {
      state.org = action.payload;
      state.loading = false;
      state.error = null;
    },

    setOrgLoading: (state, action) => {
      state.loading = action.payload;
    },

    setOrgError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    clearOrg: (state) => {
      state.org = null;
    },
  },
});

export const {
  setOrg,
  setOrgLoading,
  setOrgError,
  clearOrg,
} = orgSlice.actions;

export default orgSlice.reducer;