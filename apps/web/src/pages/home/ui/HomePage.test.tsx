import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the generated home page content', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <HomePage />
        </AppProviders>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'my-app' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Feature-Sliced Design foundation/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /Open the Redux example/i }),
    ).toHaveAttribute('href', '/redux');

    expect(
      screen.getByRole('link', { name: /Open the React Query example/i }),
    ).toHaveAttribute('href', '/react-query');
  });
});
