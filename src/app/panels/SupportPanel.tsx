import { AuthorSupportSection } from '@/features/support/ui/AuthorSupportSection';

export function SupportPanel() {
  return (
    <section className="panel support-panel" aria-labelledby="support-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="support-title">
            Support
          </h2>
          <p className="panel-subtitle">
            Keep OneAgent useful and easy to maintain.
          </p>
        </div>
      </div>
      <AuthorSupportSection />
    </section>
  );
}
