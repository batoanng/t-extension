import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/shared/api';
import { Provider } from 'react-redux';
import { store } from '@/app/store';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          {children}
        </Provider>
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" /> : null}
      </QueryClientProvider>
    </>
  );
}
