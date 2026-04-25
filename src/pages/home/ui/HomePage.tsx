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

      </section>
    </main>
  );
}
