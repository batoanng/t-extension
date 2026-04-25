# SPECS.md

# Developer Assistant Chrome Extension

## 1. Overview

Developer Assistant is a Chrome extension for developers who want help turning rough requests into stronger prompts for AI coding tools.

The product now supports two operating modes:

1. `Default BYOK OpenAI`
2. `Developer Assistant Pro`

The default path is BYOK. Users can install the extension, save their own OpenAI API key locally, and optimize prompts without creating an account.

Developer Assistant Pro is the paid hosted path. Pro users log in, subscribe through Stripe, and use hosted prompt optimization powered by the app owner's DeepSeek API key. The user does not provide their own AI API key for Pro optimization.

This spec replaces the earlier assumption that the entire product was single-mode BYOK with no auth or billing.

---

## 2. Product goals

### Primary goal

Ship a developer-focused extension with a clear commercial model:

- free-to-start default BYOK usage
- optional paid hosted Pro subscription
- simple upgrade path from BYOK to Pro

### First feature goal

Prompt Optimizer remains the first core feature, but it must now work across both product modes:

- BYOK users optimize with their own OpenAI key
- Pro users optimize through the hosted service using the app owner's DeepSeek key

### Business goal

Create a pricing and access model that:

- keeps the product usable without sign-up friction
- supports recurring revenue through Pro
- makes hosted usage economically controllable via configurable monthly pricing in Australian dollars

---

## 3. Product modes

### 3.1 Default mode: BYOK OpenAI

This is the default entry path for the product.

Characteristics:

- no account required
- no login required
- no Stripe subscription required
- user adds and manages their own OpenAI API key
- prompt optimization uses the user's OpenAI key
- key is stored locally in the extension

This mode should be available immediately after install.

### 3.2 Paid mode: Developer Assistant Pro

This is the hosted subscription tier.

Characteristics:

- account login required
- active paid subscription required
- billing handled through Stripe
- hosted prompt optimization uses the app owner's DeepSeek API key
- user does not need to enter their own AI key for Pro optimization

Pro is an upgrade path, not the default requirement.

### 3.3 Relationship between the two modes

- BYOK and Pro can coexist in the same product
- users can start in BYOK and upgrade later
- login must not block BYOK usage
- Pro unlocks hosted optimization and future hosted premium features
- BYOK remains available even if a Pro subscription is inactive, as long as the user provides their own OpenAI key

---

## 4. Pricing and billing model

### 4.1 Pricing

Developer Assistant Pro uses a monthly recurring subscription.

Pricing requirements:

- price is displayed in `A$`
- monthly price is configurable by the app owner
- pricing must not be hardcoded in product copy or implementation assumptions
- the extension and related product surfaces should read and display the currently configured Pro monthly price

### 4.2 Billing provider

Stripe is the billing system for Pro.

Stripe is responsible for:

- checkout
- subscription creation
- payment collection
- renewals
- cancellation handling
- payment method updates
- customer billing portal flows if provided

### 4.3 Plan model

The initial paid offer is a single Pro plan.

For the first commercial version:

- one monthly Pro plan is sufficient
- annual pricing is out of scope
- team billing is out of scope
- usage-based metering is out of scope

---

## 5. Authentication and access rules

### 5.1 BYOK authentication rule

BYOK does not require login.

The user can:

- install the extension
- add an OpenAI API key
- optimize prompts

without creating an account.

### 5.2 Pro authentication rule

Pro requires login because the system must associate subscription state with a user account.

The user must be able to:

- sign up or log in
- view Pro status
- start Stripe checkout
- return from checkout with updated access
- manage billing

### 5.3 Important product rule

Login should only be enforced for Pro features.

The extension must not force BYOK users through auth walls, account creation, or billing prompts before they can use the default prompt optimizer.

---

## 6. User journeys

### 6.1 New user, default BYOK path

1. User installs the extension.
2. User sees Prompt Optimizer with a BYOK option available by default.
3. User adds their own OpenAI API key.
4. User enters a raw prompt.
5. The system optimizes the prompt using the user's OpenAI key.
6. The user can continue without ever creating an account.

### 6.2 New user, Pro upgrade path

1. User installs the extension.
2. User sees an option to upgrade to Developer Assistant Pro.
3. User chooses Pro.
4. User signs up or logs in.
5. User starts Stripe checkout.
6. Stripe confirms an active subscription.
7. The extension unlocks hosted optimization.
8. User optimizes prompts without entering their own AI key.

### 6.3 Existing Pro user

1. User logs in.
2. Extension fetches account and subscription state.
3. If subscription is active, Pro hosted optimization is enabled.
4. User can manage billing from the account area.

### 6.4 Inactive subscription user

1. User logs in.
2. Extension detects the subscription is not active.
3. Pro hosted optimization is disabled.
4. User sees a clear status such as renew, update payment method, or resubscribe.
5. User may continue in BYOK mode if they provide their own OpenAI key.

---

## 7. Subscription states and required behavior

### 7.1 Active subscription

An active subscription unlocks:

- Pro badge/status
- hosted optimization
- any future Pro-only hosted features

### 7.2 Inactive subscription

For this product, inactive includes states such as:

- canceled
- expired
- unpaid
- past due
- incomplete and not recoverable
- otherwise not entitled to Pro access

Required product behavior:

- do not allow Pro hosted optimization while inactive
- show a clear billing/access message
- provide a recovery action such as resubscribe or manage billing
- do not delete the user's account just because the subscription is inactive
- allow fallback to BYOK if the user has or adds a valid OpenAI key

### 7.3 Graceful fallback rule

If a formerly Pro user loses active status:

- Pro-only hosted optimization must stop
- saved Pro account access can remain for account and billing management
- the extension should offer BYOK as the fallback path instead of turning the whole product into a dead end

---

## 8. Prompt optimization model routing

### 8.1 BYOK routing

When the user is operating in BYOK mode:

- the extension uses the user's OpenAI API key
- the backend processes the request in BYOK mode
- the server must not persist that key

### 8.2 Pro routing

When the user is operating in Pro mode:

- the user must be logged in
- the user must have an active subscription
- the hosted optimization path uses the app owner's DeepSeek API key
- the DeepSeek key remains server-side only

### 8.3 Mode separation rules

- a BYOK request must not silently consume the app owner's paid DeepSeek capacity
- a Pro request must not require the user to add an OpenAI key
- model/provider selection should be explicit in business logic and observability

---

## 9. High-level architecture

```txt
Chrome Extension Popup
        |
        | User chooses available path
        v
Mode Routing
   |                     |
   | BYOK                | Pro
   v                     v
Local OpenAI key         Logged-in account + active subscription
   |                     |
   v                     v
Backend BYOK flow        Backend hosted Pro flow
   |                     |
   | uses user's         | uses app owner's
   | OpenAI key          | DeepSeek key
   v                     v
Prompt optimization result returned to extension
```

---

## 10. Extension responsibilities

The extension is responsible for:

- rendering Prompt Optimizer
- letting users start in BYOK mode without login
- saving the BYOK OpenAI key locally when the user chooses BYOK
- showing Pro upsell and Pro status
- supporting login entry points for Pro only
- launching Stripe subscription flow for Pro
- showing subscription state clearly
- routing optimize actions to the correct mode
- showing loading, success, and error states
- allowing copy of the optimized prompt

The extension should not:

- require login for basic BYOK usage
- expose the app owner's DeepSeek key
- expose the user's saved OpenAI key after save
- log secrets
- keep Pro enabled when subscription state is inactive

---

## 11. Backend responsibilities

The backend is responsible for:

- handling prompt optimization requests
- distinguishing BYOK requests from Pro hosted requests
- validating subscription status before allowing Pro optimization
- integrating with Stripe for subscription state
- using the app owner's DeepSeek key only for entitled Pro requests
- using the user's OpenAI key only for BYOK requests
- protecting secrets
- returning user-safe errors

The backend should not:

- persist BYOK OpenAI keys
- leak billing internals to the extension UI
- allow inactive subscribers to continue using hosted Pro optimization
- use the Pro hosted path for anonymous free traffic

---

## 12. Prompt Optimizer feature definition

### User story

As a developer, I want to enter a rough prompt and receive a clearer, more structured prompt so that an AI coding tool can do better work.

### Expected improvement behavior

The optimized prompt should:

- preserve the user's original intent
- clarify the requested role and task
- add useful structure
- surface missing context as questions or placeholders
- avoid invented facts
- remain practical for coding workflows

### Example raw prompt

```txt
fix my react code the page slow and state weird
```

### Example optimized prompt

```txt
You are a senior React and TypeScript engineer.

Help me diagnose a React page with performance issues and inconsistent state behavior.

Please do the following:

1. Identify likely causes of unnecessary re-renders.
2. Review state patterns that could lead to stale or inconsistent state.
3. Suggest specific improvements using React best practices.
4. Provide corrected code where appropriate.
5. Ask for any missing component or state-management context before making risky assumptions.
```

---

## 13. UI and UX requirements

### 13.1 Main product framing

The popup should make the two product paths obvious:

- `Use your own OpenAI key`
- `Upgrade to Developer Assistant Pro`

The default emphasis should remain on immediate usability, not on forced account creation.

### 13.2 BYOK state

When no BYOK key is saved:

- show OpenAI key input
- explain that no login is required for BYOK
- disable optimize action until required input is present

When a BYOK key is saved:

- mask the key
- allow replace or remove
- allow prompt optimization in BYOK mode

### 13.3 Pro state

When logged out:

- show Pro value proposition
- allow login or sign-up entry point
- do not block BYOK usage

When logged in with active Pro:

- show active Pro status
- indicate that hosted optimization is available
- do not ask for an OpenAI key for Pro usage

When logged in with inactive Pro:

- show inactive/past-due/canceled state clearly
- disable hosted optimization
- show recovery action
- offer BYOK fallback if no active subscription is present

### 13.4 Suggested messaging

BYOK helper text:

```txt
Use your own OpenAI API key. No account required.
```

Pro helper text:

```txt
Upgrade to Developer Assistant Pro for hosted optimization with no personal AI key required.
```

Inactive Pro text:

```txt
Your Pro subscription is inactive. Renew Pro to use hosted optimization, or continue with your own OpenAI key.
```

---

## 14. Stripe subscription flow

### 14.1 Checkout flow

Required business flow:

1. User selects Pro.
2. User signs up or logs in.
3. User starts Stripe checkout.
4. Stripe creates or updates the subscription.
5. Product returns the user to the extension/app flow.
6. Subscription state is refreshed.
7. Pro access is granted only after the subscription is confirmed active.

### 14.2 Billing management flow

The user should be able to:

- view current Pro status
- open billing management
- update payment method
- cancel subscription
- recover an inactive subscription

### 14.3 Pricing display rule

Every user-facing Pro purchase surface should display the configured monthly Pro price in Australian dollars.

Do not bake a fixed A$ amount into documentation, product logic, or acceptance criteria.

---

## 15. Security and privacy requirements

### 15.1 BYOK key handling

The user's OpenAI API key:

- is stored locally in the extension
- is only used for BYOK optimization
- must not be persisted remotely
- must not be logged in plain text

### 15.2 Pro key handling

The app owner's DeepSeek API key:

- is stored server-side only
- is never exposed to the extension
- is used only for active Pro hosted optimization
- must not be logged in plain text

### 15.3 Account and billing data

The product may store the minimum account and subscription data required for:

- authentication
- entitlement checks
- billing support
- subscription lifecycle handling

The product should not store more prompt data or billing detail than necessary for the user experience and operations.

---

## 16. Logging requirements

Allowed:

- optimization request received
- optimization completed
- Stripe checkout started
- subscription state refreshed
- hosted optimization denied because subscription inactive

Not allowed:

- raw BYOK OpenAI key
- app owner's DeepSeek key
- full payment card data
- unnecessary full prompt logs in production

---

## 17. Validation and entitlement rules

### 17.1 BYOK rules

- OpenAI key required for BYOK optimization
- no login required
- optimize action disabled if key or prompt is missing

### 17.2 Pro rules

- login required
- active subscription required
- optimize action through hosted Pro path disabled when subscription is inactive
- user should see a clear next step if blocked by billing state

### 17.3 Prompt validation

For both modes:

- prompt is required
- prompt should be trimmed
- empty or clearly invalid submissions should be rejected

---

## 18. Error handling UX

The product should present business-readable errors instead of low-level provider detail.

Examples:

- missing BYOK key
- login required for Pro
- Pro subscription inactive
- Stripe checkout could not be started
- hosted optimization temporarily unavailable
- AI provider request failed

Suggested user-facing messages:

```txt
Add your OpenAI API key to use BYOK mode.
```

```txt
Log in to use Developer Assistant Pro.
```

```txt
Your Pro subscription is inactive. Renew billing or continue in BYOK mode.
```

```txt
Unable to start checkout right now. Please try again.
```

```txt
Prompt optimization is temporarily unavailable. Please try again later.
```

---

## 19. Acceptance criteria

### 19.1 BYOK path

- [ ] A user can use the extension in BYOK mode without creating an account.
- [ ] A user can enter, save, replace, and remove an OpenAI API key locally.
- [ ] The saved BYOK key is masked after save.
- [ ] Prompt optimization works in BYOK mode with the user's OpenAI key.
- [ ] The product clearly explains that BYOK does not require login.

### 19.2 Pro path

- [ ] A user can log in specifically for Pro access.
- [ ] A logged-in user can start a Stripe checkout flow for Pro.
- [ ] The product displays the configured Pro monthly price in A$.
- [ ] A user with an active Pro subscription can use hosted optimization without entering a personal AI key.
- [ ] Hosted Pro optimization uses the app owner's DeepSeek key and not a user BYOK key.

### 19.3 Subscription lifecycle

- [ ] The product can distinguish active vs inactive Pro subscription states.
- [ ] Hosted Pro optimization is blocked when subscription status is inactive.
- [ ] The product shows a clear recovery action for inactive subscriptions.
- [ ] A user with an inactive Pro subscription can still use BYOK mode if they add their own OpenAI key.

### 19.4 Security and clarity

- [ ] The user's OpenAI BYOK key is not permanently stored on the server.
- [ ] The app owner's DeepSeek key is never exposed to the client.
- [ ] Login is not required for default BYOK usage.
- [ ] Product messaging clearly differentiates BYOK from Pro.
- [ ] Production logging avoids secrets.

---

## 20. Non-goals for this commercial version

This version should not include:

- forcing all users to register before first use
- annual plans
- team plans
- seat management
- credits marketplace
- multiple Pro tiers
- deep technical provider controls exposed to users
- large prompt history platform features

---

## 21. Revised roadmap

### Phase 1: Dual-mode foundation

- launch default BYOK OpenAI flow
- add Pro account login flow
- add Stripe monthly subscription in A$
- gate hosted optimization behind active Pro
- support inactive-subscription fallback to BYOK

### Phase 2: Conversion and retention

- improve Pro upgrade surfaces
- add billing management polish
- improve subscription-state messaging
- add recovery flows for failed payments and cancellations

### Phase 3: Product expansion

- add more prompt templates
- add agent-specific optimization styles
- add saved prompt history
- add reusable personal presets

### Phase 4: Premium expansion

- add more hosted Pro-only developer workflows
- add higher-value premium features beyond prompt optimization
- evaluate team and workspace features only after the single-user Pro model is stable

---

## 22. Open questions

These should be decided before implementation is considered final:

1. Should inactive Pro users keep access to any non-hosted premium UI, or should all Pro UI collapse to billing recovery plus BYOK fallback?
2. Should the extension remember the user's last-selected mode between BYOK and Pro?
3. Should there be a free logged-in account state for future non-Pro features, or should auth continue to exist only for Pro?
4. Should Pro include quotas or fair-use protections later, even though the initial offer is a simple monthly plan?

---

## 23. Recommended positioning

Recommended product message:

```txt
Start free with your own OpenAI key. Upgrade to Developer Assistant Pro for hosted optimization with no personal AI key required.
```
