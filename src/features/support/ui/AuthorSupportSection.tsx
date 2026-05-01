import { useState } from 'react';

import { createDonationCheckoutSession } from '@/shared/api';
import { env } from '@/shared/config';
import { InlineMessage } from '@/shared/ui/InlineMessage';

const authorLinkedInUrl = 'https://www.linkedin.com/in/batoannguyen/';
const presetAmounts = [300, 500, 1000, 2500] as const;
const minDonationAudCents = 200;
const maxDonationAudCents = 20_000;

function formatAud(amountAudCents: number) {
  const formattedAmount = new Intl.NumberFormat('en-AU', {
    maximumFractionDigits: amountAudCents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: amountAudCents % 100 === 0 ? 0 : 2,
  }).format(amountAudCents / 100);

  return `A$${formattedAmount}`;
}

function parseAudCents(value: string) {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [dollars, cents = ''] = trimmed.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

export function AuthorSupportSection() {
  const [selectedAmountAudCents, setSelectedAmountAudCents] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState<string | null>(null);

  const hasCustomAmount = customAmount.trim().length > 0;
  const customAmountAudCents = hasCustomAmount
    ? parseAudCents(customAmount)
    : null;
  const amountAudCents = customAmountAudCents ?? selectedAmountAudCents;
  const hasValidAmount =
    (!hasCustomAmount || customAmountAudCents !== null) &&
    amountAudCents >= minDonationAudCents &&
    amountAudCents <= maxDonationAudCents;

  async function openCoffeeCheckout() {
    if (!hasValidAmount) {
      setStatus('error');
      setMessage('Choose an amount between A$2 and A$200.');
      return;
    }

    setStatus('loading');
    setMessage(null);

    try {
      const result = await createDonationCheckoutSession({
        amountAudCents,
        serverBaseUrl: env.serverBaseUrl,
      });

      globalThis.open?.(result.url, '_blank', 'noopener,noreferrer');
      setStatus('success');
      setMessage('Coffee checkout opened in a new tab.');
    } catch {
      setStatus('error');
      setMessage('Unable to open coffee checkout right now.');
    }
  }

  return (
    <section className="panel support-panel" aria-labelledby="support-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="support-title">
            Author
          </h2>
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
        </div>
      </div>

      <div className="stack">
        <div className="coffee-box">
          <div>
            <h3 className="section-title">Buy me a coffee</h3>
            <p className="hint-text">
              Choose an amount and continue through Stripe Checkout.
            </p>
          </div>

          <div className="amount-grid" role="group" aria-label="Coffee amount">
            {presetAmounts.map((amount) => (
              <button
                className={`amount-button${
                  customAmount === '' && selectedAmountAudCents === amount
                    ? ' is-active'
                    : ''
                }`}
                key={amount}
                onClick={() => {
                  setSelectedAmountAudCents(amount);
                  setCustomAmount('');
                  setMessage(null);
                  setStatus('idle');
                }}
                type="button"
              >
                {formatAud(amount)}
              </button>
            ))}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="coffee-custom-amount">
              Custom amount
            </label>
            <input
              className="text-input"
              id="coffee-custom-amount"
              inputMode="decimal"
              min="2"
              max="200"
              onChange={(event) => {
                setCustomAmount(event.target.value);
                setMessage(null);
                setStatus('idle');
              }}
              placeholder="A$"
              step="0.01"
              type="number"
              value={customAmount}
            />
          </div>

          {message ? (
            <InlineMessage tone={status === 'error' ? 'error' : 'success'}>
              {message}
            </InlineMessage>
          ) : null}

          <div className="button-row">
            <button
              className="button button-primary"
              disabled={status === 'loading'}
              onClick={() => {
                void openCoffeeCheckout();
              }}
              type="button"
            >
              {status === 'loading'
                ? 'Opening checkout...'
                : `Support with ${formatAud(amountAudCents)}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
