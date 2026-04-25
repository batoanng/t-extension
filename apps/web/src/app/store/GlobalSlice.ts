import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { resetGlobalState } from './actions';

export interface GlobalState {
  counter: number;
  note: string;
  lastUpdatedAt: string | null;
}

const INITIAL_STATE: GlobalState = {
  counter: 0,
  note: 'Redux state is persisted with redux-persist.',
  lastUpdatedAt: null,
};

const slice = createSlice({
  name: 'global',
  initialState: INITIAL_STATE,
  reducers: {
    decrement: (state) => {
      state.counter -= 1;
      state.lastUpdatedAt = new Date().toISOString();
    },
    increment: (state) => {
      state.counter += 1;
      state.lastUpdatedAt = new Date().toISOString();
    },
    setNote: (state, { payload }: PayloadAction<string>) => {
      state.note = payload;
      state.lastUpdatedAt = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetGlobalState, () => INITIAL_STATE);
  },
});

export const { reducer } = slice;
export const { decrement, increment, setNote } = slice.actions;

export function selectGlobalCounter(state: GlobalState): number {
  return state.counter;
}

export function selectGlobalLastUpdatedAt(state: GlobalState): string | null {
  return state.lastUpdatedAt;
}

export function selectGlobalNote(state: GlobalState): string {
  return state.note;
}
