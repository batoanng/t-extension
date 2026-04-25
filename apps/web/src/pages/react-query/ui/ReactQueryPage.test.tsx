import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers';
import { ReactQueryPage } from './ReactQueryPage';

describe('ReactQueryPage', () => {
  it('renders the generated React Query setup guidance', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <ReactQueryPage />
        </AppProviders>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Query client and sample GET\/POST hooks are wired in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Default API base URL/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText('src/shared/api/useApiQuery.ts'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Return to the home page/i }),
    ).toHaveAttribute('href', '/');
  });
});
