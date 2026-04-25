import { Link } from 'react-router-dom';
import { env } from '@/shared/config';

const generatedFiles = [
  'src/shared/api/createApiClient.ts',
  'src/shared/api/createQueryClient.ts',
  'src/shared/api/useApiQuery.ts',
  'src/shared/api/useApiMutation.ts',
  'src/features/react-query-demo/api/useSampleGetQuery.ts',
  'src/features/react-query-demo/api/useSamplePostMutation.ts',
];

export function ReactQueryPage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">React Query example</p>
        <h1>Query client and sample GET/POST hooks are wired in</h1>
        <p>
          This route is a setup guide for the generated React Query feature. The
          QueryClient provider, devtools, Axios client, and generic wrappers are
          already added to the app shell.
        </p>
        <p>
          Default API base URL: <code>{env.apiBaseUrl}</code>
        </p>
        <p>
          The generated sample hooks show how to compose <code>useApiQuery</code>{' '}
          and <code>useApiMutation</code> around one GET request, one POST request,
          typed schemas, and cache invalidation.
        </p>
        <ul>
          {generatedFiles.map((filePath) => (
            <li key={filePath}>
              <code>{filePath}</code>
            </li>
          ))}
        </ul>
        <p>
          Replace the sample endpoint paths and response schemas with your real
          API contract once your backend is ready.
        </p>
        <p>
          <Link to="/">Return to the home page</Link>
        </p>
      </section>
    </main>
  );
}
