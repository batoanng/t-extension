import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setStoredString } from '@/shared/lib/chromeStorage';
import {
  __resetSavedApiKeyStoreForTests,
  useSavedApiKey,
} from './useSavedApiKey';

describe('useSavedApiKey', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedApiKeyStoreForTests();
    vi.unstubAllGlobals();
  });

  it('hydrates the saved key from storage and reacts to updates', async () => {
    await setStoredString('openai_api_key', 'sk-existing');

    const { result } = renderHook(() => useSavedApiKey());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.apiKey).toBe('sk-existing');

    await act(async () => {
      await result.current.saveApiKey('sk-next');
    });

    expect(result.current.apiKey).toBe('sk-next');

    await act(async () => {
      await result.current.removeApiKey();
    });

    expect(result.current.apiKey).toBeNull();
  });
});
