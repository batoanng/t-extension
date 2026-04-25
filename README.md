# Developer Assistant Chrome Extension

Developer Assistant is a Chrome extension for developers who want better prompts before sending work to AI coding tools.

The product now has two clear paths:

- `Default BYOK`: users bring their own OpenAI API key and can use prompt optimization without creating an account.
- `Developer Assistant Pro`: paid hosted optimization for users who prefer not to manage their own model key. Pro runs on the app owner's hosted DeepSeek setup.

## Product Flow

### 1. Default experience: BYOK OpenAI

- A new user installs the extension and can start in BYOK mode immediately.
- The user adds their own OpenAI API key in the extension.
- No login is required for this path.
- The user pays OpenAI directly for their own usage outside of Developer Assistant.

### 2. Optional upgrade: Developer Assistant Pro

- Users who want a managed experience can upgrade to Pro.
- Pro requires an account login because subscription status must be tied to a customer.
- Billing runs through Stripe with a recurring monthly subscription.
- Pricing is shown in Australian dollars and is configurable by the app owner rather than hardcoded into the product story.
- Pro prompt optimization is hosted and uses the app owner's DeepSeek key. Users do not need to enter their own AI key for Pro.

## Billing And Access

- Login is required only for Pro features and subscription management.
- Stripe handles checkout, payment method updates, renewals, and cancellation flows.
- An active Pro subscription unlocks hosted optimization and future Pro-only capabilities.
- If a Pro subscription becomes inactive, canceled, unpaid, expired, or otherwise not active, hosted optimization is disabled until the subscription is restored.
- Users with an inactive Pro subscription can still use the extension in BYOK mode if they provide their own OpenAI key.

## Current Scope

The first core feature remains Prompt Optimizer:

- user enters a rough developer prompt
- Developer Assistant rewrites it into a clearer, more actionable prompt
- user copies the improved result into their coding agent of choice

## Product Direction

Near-term direction:

- stabilize the dual-mode BYOK + Pro experience
- make billing and subscription status easy to understand in the extension
- expand Pro-only hosted optimization
- add more developer workflow helpers after the commercial flow is stable

Longer-term opportunities:

- more prompt templates and agent-specific output modes
- saved history and reusable prompt assets
- context-aware workflows tied to docs, tickets, and repositories
- additional paid features beyond prompt optimization
