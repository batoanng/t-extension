import { useState } from 'react';

import { ApiKeySection } from '@/features/api-key/ui/ApiKeySection';
import { AccessMode, getAccessPanelIssue } from '@/shared/model/access';
import { InlineMessage } from '@/shared/ui/InlineMessage';

import { useAccessStore } from '../model/useAccessStore';

export function AccessPanel() {
  const accessStore = useAccessStore();
  const {
    byok,
    mode,
    offering,
    pro,
    ready,
    openCheckout,
    openCustomerPortal,
    refreshOffering,
    refreshSubscriptionStatus,
    removeByokConfig,
    saveByokConfig,
    sendMagicLink,
    setAccessPanelCollapsed,
    setMode,
    signOut,
    ui,
  } = accessStore;
  const [email, setEmail] = useState('');
  const accessIssue = getAccessPanelIssue(accessStore);
  const isCollapsed = ui.accessPanelCollapsed;
  const toggleLabel = isCollapsed
    ? 'Expand optimization access'
    : 'Collapse optimization access';
  const panelIssueMessage =
    mode === AccessMode.Byok
      ? (accessIssue?.message ?? null)
      : (ui.accessIssue?.message ?? null);

  return (
    <section
      className={`panel access-panel${isCollapsed ? ' is-collapsed' : ''}`}
      aria-labelledby="access-title"
    >
      <div className="panel-header access-panel-header">
        <div>
          <h2 className="panel-title" id="access-title">
            Optimization Access
          </h2>
          {!isCollapsed ? (
            <p className="panel-subtitle">
              Keep your own model access local, or use the author&apos;s shared
              hosted key with a subscription.
            </p>
          ) : null}
        </div>

        <div className="panel-actions">
          {accessIssue ? (
            <span
              aria-label="Optimization access needs attention"
              className="status-icon status-icon-error"
              role="img"
            >
              !
            </span>
          ) : null}

          <button
            aria-expanded={!isCollapsed}
            aria-label={toggleLabel}
            className="icon-button"
            onClick={() => {
              void setAccessPanelCollapsed(!isCollapsed);
            }}
            type="button"
          >
            <span aria-hidden="true">{isCollapsed ? '▾' : '▴'}</span>
          </button>
        </div>
      </div>

      {!isCollapsed ? (
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
              {panelIssueMessage ? (
                <InlineMessage tone="error">{panelIssueMessage}</InlineMessage>
              ) : null}

              <ApiKeySection
                byokConfig={byok}
                isReady={ready}
                onRemoveByokConfig={removeByokConfig}
                onSaveByokConfig={saveByokConfig}
              />
            </div>
          ) : (
            <div className="pro-card">
              <div className="stack">
                <p className="hint-text">
                  Use the author&apos;s shared hosted key to optimize prompts
                  after subscribing.
                </p>

                {panelIssueMessage ? (
                  <InlineMessage tone="error">
                    {panelIssueMessage}
                  </InlineMessage>
                ) : null}

                {offering.status === 'ready' && offering.data ? (
                  <div className="price-band">
                    <strong>A${offering.data.priceAudMonthly} / month</strong>
                    <span>Shared hosted optimization access</span>
                  </div>
                ) : null}

                {offering.status === 'error' && offering.errorMessage ? (
                  <InlineMessage tone="error">
                    {offering.errorMessage}
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
                        Sign in to subscribe and use shared hosted
                        optimization.
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
                        Subscription active. Prompt optimization will use the
                        author&apos;s shared hosted key.
                      </InlineMessage>
                    ) : null}

                    {pro.subscription.status === 'inactive' ? (
                      <InlineMessage>
                        Subscribe for shared hosted access to enable hosted
                        optimization.
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
                      void refreshOffering();
                    }}
                    type="button"
                  >
                    Refresh pricing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
