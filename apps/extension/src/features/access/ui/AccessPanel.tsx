import { useState } from 'react';
import { ApiKeySection } from '@/features/api-key/ui/ApiKeySection';
import { InlineMessage } from '@/shared/ui/InlineMessage';
import { useAccessStore } from '../model/useAccessStore';

export function AccessPanel() {
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
    removeApiKey,
    saveApiKey,
    sendMagicLink,
    setMode,
    signOut,
  } = useAccessStore();
  const [email, setEmail] = useState('');

  return (
    <section className="panel" aria-labelledby="access-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="access-title">
            Optimization Access
          </h2>
          <p className="panel-subtitle">
            Use your own OpenAI API key by default, or subscribe to Developer
            Assistant Pro to run Prompt Optimizer with the app&apos;s DeepSeek key.
          </p>
        </div>
      </div>

      <div className="stack">
        <div className="segmented-control" role="tablist" aria-label="Access mode">
          <button
            className={`segment-button${mode === 'byok' ? ' is-active' : ''}`}
            onClick={() => {
              void setMode('byok');
            }}
            type="button"
          >
            Use my own key
          </button>
          <button
            className={`segment-button${mode === 'pro' ? ' is-active' : ''}`}
            onClick={() => {
              void setMode('pro');
            }}
            type="button"
          >
            Developer Assistant Pro
          </button>
        </div>

        {mode === 'byok' ? (
          <ApiKeySection
            hasApiKey={Boolean(byok.apiKey)}
            isReady={ready}
            onRemoveApiKey={removeApiKey}
            onSaveApiKey={saveApiKey}
          />
        ) : (
          <div className="pro-card">
            <div className="stack">
              {offering.status === 'ready' && offering.data ? (
                <div className="price-band">
                  <strong>
                    A${offering.data.priceAudMonthly} / month
                  </strong>
                  <span>Hosted Prompt Optimizer with the app&apos;s DeepSeek key</span>
                </div>
              ) : null}

              {offering.status === 'error' && offering.errorMessage ? (
                <InlineMessage tone="error">{offering.errorMessage}</InlineMessage>
              ) : null}

              {pro.auth.status === 'signed-out' || pro.auth.status === 'error' ? (
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
                    <InlineMessage tone="error">{pro.auth.message}</InlineMessage>
                  ) : (
                    <InlineMessage>
                      Sign in to subscribe and use hosted optimization.
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
                      Subscription active. Prompt optimization will use Developer
                      Assistant&apos;s DeepSeek key.
                    </InlineMessage>
                  ) : null}

                  {pro.subscription.status === 'inactive' ? (
                    <InlineMessage>
                      Subscribe to Developer Assistant Pro to enable hosted
                      optimization.
                    </InlineMessage>
                  ) : null}

                  {pro.subscription.status === 'error' && pro.subscription.message ? (
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
                        Subscribe
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
    </section>
  );
}
