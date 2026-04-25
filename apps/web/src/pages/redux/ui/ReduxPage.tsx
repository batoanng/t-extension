import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  decrement,
  increment,
  PERSIST_STORAGE_KEY,
  resetGlobalState,
  selectGlobalCounter,
  selectGlobalLastUpdatedAt,
  selectGlobalNote,
  setNote,
  useAppDispatch,
  useAppSelector,
} from '@/app/store';
import { env } from '@/shared/config';

export function ReduxPage() {
  const dispatch = useAppDispatch();
  const counter = useAppSelector((state) => selectGlobalCounter(state.global));
  const lastUpdatedAt = useAppSelector((state) =>
    selectGlobalLastUpdatedAt(state.global),
  );
  const note = useAppSelector((state) => selectGlobalNote(state.global));
  const persistedStorageKey = `persist:${PERSIST_STORAGE_KEY}`;

  const handleNoteChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setNote(event.target.value));
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Redux example</p>
        <h1>Centralized state, ready to persist</h1>
        <p>
          The Redux feature adds a persisted store for {env.appName}, typed hooks,
          and a dedicated route that follows the example app structure.
        </p>
        <p>
          Development logging is{' '}
          {env.enableReduxLogging ? 'enabled' : 'disabled'} by
          {' '}<code>VITE_ENABLE_REDUX_LOGGING</code>.
        </p>
        <p>
          Persisted storage key: <code>{persistedStorageKey}</code>
        </p>
        <p>Counter value: {counter}</p>
        <p>
          Last updated:{' '}
          {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : 'Not updated yet'}
        </p>
        <p>
          <label htmlFor="redux-note">Persisted note</label>
        </p>
        <p>
          <textarea
            id="redux-note"
            value={note}
            onChange={handleNoteChange}
            rows={4}
            style={{ width: '100%' }}
          />
        </p>
        <p>
          <button type="button" onClick={() => dispatch(decrement())}>
            Decrease count
          </button>{' '}
          <button type="button" onClick={() => dispatch(increment())}>
            Increase count
          </button>{' '}
          <button type="button" onClick={() => dispatch(resetGlobalState())}>
            Reset persisted state
          </button>
        </p>
        <p>
          <Link to="/">Return to the home page</Link>
        </p>
      </section>
    </main>
  );
}
