import { Link } from 'react-router-dom';
import { env } from '@/shared/config';

export function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Base application</p>
        <h1>{env.appName}</h1>
        <p>
          React + TypeScript + Vite starter with routing, testing, aliases, and a
          Feature-Sliced Design foundation.
        </p>
        <p>
          Tailwind CSS v4 is enabled through an opt-in add-on, so utility styling
          layers onto the generated app shell without forcing it into every base
          project.
        </p>
        <p>
          Redux scaffolding is ready for this project, including a persisted store,
          typed hooks, and an example route based on the repo&apos;s example app.
        </p>
        <p>
          React Query scaffolding is ready for this project, including a shared
          QueryClient, Axios-based query helpers, and a dedicated setup example
          route.
        </p>
        <p>
          <Link to="/redux">Open the Redux example</Link>
        </p>
        <p>
          <Link to="/react-query">Open the React Query example</Link>
        </p>
      </section>
    </main>
  );
}
