const authorLinkedInUrl = 'https://www.linkedin.com/in/batoannguyen/';

export function AuthorSupportSection() {
  return (
    <p className="panel-subtitle">
      Built by{' '}
      <a
        className="text-link"
        href={authorLinkedInUrl}
        rel="noreferrer"
        target="_blank"
      >
        Ba Toan Nguyen
      </a>
      .
    </p>
  );
}
