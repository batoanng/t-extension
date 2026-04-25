import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PERSIST_STORAGE_KEY,
  persistor,
  resetGlobalState,
  store,
} from '@/app/store';
import { ReduxPage } from './ReduxPage';

const persistedStorageKey = `persist:${PERSIST_STORAGE_KEY}`;

describe('ReduxPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    store.dispatch(resetGlobalState());
    await persistor.flush();
  });

  afterEach(async () => {
    store.dispatch(resetGlobalState());
    await persistor.flush();
    localStorage.clear();
  });

  it('dispatches Redux updates and persists them', async () => {
    render(
      <MemoryRouter>
        <Provider store={store}>
          <ReduxPage />
        </Provider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Increase count/i }));
    fireEvent.change(screen.getByLabelText(/Persisted note/i), {
      target: { value: 'Persisted through the Redux example' },
    });

    expect(screen.getByText(/Counter value: 1/i)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Persisted through the Redux example'),
    ).toBeInTheDocument();

    await persistor.flush();

    await waitFor(() => {
      const persistedState = localStorage.getItem(persistedStorageKey);

      expect(persistedState).toBeTruthy();
      expect(persistedState).toContain('"counter":1');
      expect(persistedState).toContain('Persisted through the Redux example');
    });
  });
});
