import { useState } from 'react';

import { ApiKeySection } from '@/features/api-key/ui/ApiKeySection';
import { AccessMode, getAccessPanelIssue } from '@/shared/model/access';
import { InlineMessage } from '@/shared/ui/InlineMessage';

import { useAccessStore } from '../model/useAccessStore';

interface AccessPanelProps {
  onAccessConfigured?: () => void;
}

export function AccessPanel({ onAccessConfigured }: AccessPanelProps) {
  const accessStore = useAccessStore();
  const {
    byok,
    catalog,
    mode,
    pro,
    ready,
    openCheckout,
    openCustomerPortal,
    refreshAccessCatalog,
    refreshSubscriptionStatus,
    removeByokConfig,
    saveByokConfig,
    sendMagicLink,
    setMode,
    signOut,
    ui,
  } = accessStore;
  const [email, setEmail] = useState('');
  const accessIssue = getAccessPanelIssue(accessStore);

  const panelIssueMessage =
    mode === AccessMode.Byok
      ? (accessIssue?.message ?? null)
      : (ui.accessIssue?.message ?? null);

  async function handleSaveByokConfig(
    config: Parameters<typeof saveByokConfig>[0],
  ) {
    await saveByokConfig(config);

    if (config.apiKey?.trim()) {
      onAccessConfigured?.();
    }
  }

  return (
    <section className={`panel access-panel`} aria-labelledby="access-title">
      <div className="panel-header access-panel-header">
        <div>
          <h2 className="panel-title" id="access-title">
            Generation Access
          </h2>
          <p className="panel-subtitle">
            Keep your own model access local, or use the author&apos;s shared
            hosted key with a subscription.
          </p>
        </div>

        <div className="panel-actions">
          {accessIssue ? (
            <span
              aria-label="Generation access needs attention"
              className="status-icon status-icon-error"
              role="img"
            >
              !
            </span>
          ) : null}
        </div>
      </div>

      <div className="stack access-panel-body">
        <div
          className="segmented-control"
          role="tablist"
          aria-label="Access mode"
        >
          <button
            className={`segment-button${mode === AccessMode.Byok ? ' is-active' : ''}`}
            onClick={() => {
              void setMode(AccessMode.Byok);
            }}
            type="button"
          >
            Use my own key
          </button>
          <button
            className={`segment-button${mode === AccessMode.Pro ? ' is-active' : ''}`}
            onClick={() => {
              void setMode(AccessMode.Pro);
            }}
            type="button"
          >
            Use Author Shared Key
          </button>
        </div>

        {mode === AccessMode.Byok ? (
          <div className="access-content">
            {catalog.errorMessage ? (
              <InlineMessage tone={catalog.data ? undefined : 'error'}>
                {catalog.errorMessage}
              </InlineMessage>
            ) : null}

            {panelIssueMessage ? (
              <InlineMessage tone="error">{panelIssueMessage}</InlineMessage>
            ) : null}

            <ApiKeySection
              byokConfig={byok}
              catalog={catalog.data}
              catalogStatus={catalog.status}
              isReady={ready}
              onRemoveByokConfig={removeByokConfig}
              onSaveByokConfig={handleSaveByokConfig}
            />
          </div>
        ) : (
          <div className="pro-card">
            <div className="stack">
              <p className="hint-text">
                Use the author&apos;s shared hosted key to generate briefs after
                subscribing.
              </p>

              {panelIssueMessage ? (
                <InlineMessage tone="error">{panelIssueMessage}</InlineMessage>
              ) : null}

              {catalog.status === 'ready' && catalog.data ? (
                <div className="price-band">
                  <strong>
                    A${catalog.data.sharedHostedOffering.priceAudMonthly} /
                    month
                  </strong>
                  <span>Shared hosted generation access</span>
                </div>
              ) : null}

              {catalog.errorMessage && !catalog.data ? (
                <InlineMessage tone="error">
                  {catalog.errorMessage}
                </InlineMessage>
              ) : null}

              {pro.auth.status === 'signed-out' ||
              pro.auth.status === 'error' ? (
                <>
                  <div className="field">
                    <label className="field-label" htmlFor="pro-email">
                      Email
                    </label>
                    <input
                      autoComplete="email"
                      className="text-input"
                      id="pro-email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                      }}
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                    />
                  </div>

                  {pro.auth.status === 'error' && pro.auth.message ? (
                    <InlineMessage tone="error">
                      {pro.auth.message}
                    </InlineMessage>
                  ) : (
                    <InlineMessage>
                      Sign in to subscribe and use shared hosted generation.
                    </InlineMessage>
                  )}

                  <div className="button-row">
                    <button
                      className="button button-primary"
                      disabled={email.trim().length === 0}
                      onClick={() => {
                        void sendMagicLink(email);
                      }}
                      type="button"
                    >
                      Email me a sign-in link
                    </button>
                  </div>
                </>
              ) : null}

              {pro.auth.status === 'requesting-link' ||
              pro.auth.status === 'waiting-for-verification' ? (
                <InlineMessage>
                  Check your email and open the sign-in link. Return to the
                  extension and sign-in will finish automatically.
                </InlineMessage>
              ) : null}

              {pro.auth.status === 'signed-in' ? (
                <>
                  <InlineMessage tone="success">
                    Signed in as {pro.auth.user.email}.
                  </InlineMessage>

                  {pro.subscription.status === 'active' ? (
                    <InlineMessage tone="success">
                      Subscription active. Brief generation will use the
                      author&apos;s shared hosted key.
                    </InlineMessage>
                  ) : null}

                  {pro.subscription.status === 'inactive' ? (
                    <InlineMessage>
                      Subscribe for shared hosted access to enable hosted
                      generation.
                    </InlineMessage>
                  ) : null}

                  {pro.subscription.status === 'error' &&
                  pro.subscription.message ? (
                    <InlineMessage tone="error">
                      {pro.subscription.message}
                    </InlineMessage>
                  ) : null}

                  <div className="button-row">
                    {pro.subscription.status === 'active' ? (
                      <button
                        className="button button-primary"
                        onClick={() => {
                          void openCustomerPortal();
                        }}
                        type="button"
                      >
                        Manage subscription
                      </button>
                    ) : (
                      <button
                        className="button button-primary"
                        onClick={() => {
                          void openCheckout();
                        }}
                        type="button"
                      >
                        Subscribe for Shared Access
                      </button>
                    )}

                    <button
                      className="button button-secondary"
                      onClick={() => {
                        void refreshSubscriptionStatus();
                      }}
                      type="button"
                    >
                      Refresh status
                    </button>

                    <button
                      className="button button-ghost"
                      onClick={() => {
                        void signOut();
                      }}
                      type="button"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : null}

              <div className="helper-row">
                <button
                  className="button button-ghost"
                  onClick={() => {
                    void refreshAccessCatalog();
                  }}
                  type="button"
                >
                  Refresh access catalog
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
