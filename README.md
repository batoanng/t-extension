# Developer Assistant Chrome Extension

Developer Assistant is a Chrome extension for people who want to turn rough requests into stronger prompts before sending work to AI assistants.

## Business Model

Developer Assistant now has two clear commercial paths:

- `Bring Your Own Key`: users connect their own model account and pay their chosen AI provider directly.
- `Author Shared Key`: users subscribe to a managed hosted experience and use the author’s shared access instead of managing their own key.

This creates a simple free-to-start product with a clear paid upgrade for convenience.

## Customer Paths

### 1. Bring Your Own Key

- Available immediately after install.
- No login required.
- Supports users who already pay for AI usage elsewhere.
- Lets users choose from supported providers: OpenAI, Claude, DeepSeek, Gemini, and Grok.
- Best for cost-conscious users, teams with existing AI budgets, and people who want full control over provider choice.

### 2. Author Shared Key

- Built for users who want the simplest setup.
- Requires sign-in because subscription access must be tied to an account.
- Uses a recurring Stripe subscription.
- Default product price is positioned at `A$2/month`, with pricing still configurable by the app owner.
- Best for users who want a low-friction hosted option without setting up their own API key.

## Billing And Access

- Login is required only for the subscription path and account management.
- Stripe handles checkout, renewals, cancellations, and payment method updates.
- An active subscription unlocks hosted prompt optimization and future premium hosted features.
- If a subscription becomes inactive, users can still fall back to Bring Your Own Key at any time.

## Current Offer

The first commercial feature is Prompt Optimizer:

- users enter a rough prompt
- Developer Assistant rewrites it into a clearer, more actionable request
- users copy the improved result into their preferred AI assistant

## Product Direction

Near-term priorities:

- make the two-path pricing story obvious in the extension
- keep Bring Your Own Key attractive as the default entry point
- grow the hosted subscription into the main convenience upgrade
- expand premium workflow helpers after the core billing flow is stable

Longer-term opportunities:

- reusable prompt assets and saved workflows
- premium prompt libraries for common work types
- team-oriented paid features
- additional hosted capabilities beyond prompt optimization
