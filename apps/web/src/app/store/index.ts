import { combineSlices, configureStore, Tuple } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { createLogger } from 'redux-logger';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { env } from '@/shared/config';
import { reducer as global } from './GlobalSlice';

export interface LazyLoadedSlices {}

export const PERSIST_STORAGE_KEY = 'state-my-app';

export const rootReducer = combineSlices({
  global,
}).withLazyLoadedSlices<LazyLoadedSlices>();

const persistWhitelist: Array<keyof ReturnType<typeof rootReducer>> = ['global'];

const persistedReducer = persistReducer(
  {
    key: PERSIST_STORAGE_KEY,
    storage,
    whitelist: persistWhitelist,
  },
  rootReducer,
);

const middleware = import.meta.env.DEV
  ? new Tuple(reduxImmutableStateInvariant())
  : new Tuple();

if (import.meta.env.DEV && env.enableReduxLogging) {
  middleware.push(createLogger());
}

export const store = configureStore({
  reducer: persistedReducer,
  middleware: () => middleware,
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export {
  decrement,
  increment,
  selectGlobalCounter,
  selectGlobalLastUpdatedAt,
  selectGlobalNote,
  setNote,
} from './GlobalSlice';
export { resetGlobalState } from './actions';
