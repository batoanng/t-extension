import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStoredString,
  removeStoredString,
  setStoredString,
  subscribeToStoredString,
} from './chromeStorage';

describe('chromeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('falls back to localStorage when chrome.storage is unavailable', async () => {
    await setStoredString('openai_api_key', 'sk-local');

    expect(await getStoredString('openai_api_key')).toBe('sk-local');

    await removeStoredString('openai_api_key');

    expect(await getStoredString('openai_api_key')).toBeNull();
  });

  it('subscribes to chrome.storage.onChanged when available', async () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    const get = vi.fn().mockResolvedValue({ openai_api_key: 'sk-live' });
    const set = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get,
          remove,
          set,
        },
        onChanged: {
          addListener,
          removeListener,
        },
      },
    });

    const listener = vi.fn();
    const unsubscribe = subscribeToStoredString('openai_api_key', listener);

    expect(addListener).toHaveBeenCalledTimes(1);

    const changeHandler = addListener.mock.calls[0][0];
    changeHandler(
      {
        openai_api_key: {
          newValue: 'sk-updated',
          oldValue: 'sk-live',
        },
      },
      'local',
    );

    expect(listener).toHaveBeenCalledWith('sk-updated');

    unsubscribe();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
