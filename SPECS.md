# SPECS.md

# Developer Assistant Chrome Extension

## 1. Overview

Developer Assistant is a Chrome extension that helps people turn rough requests into stronger prompts before sending work to AI assistants.

The product has two access paths:

1. `Bring Your Own Key`
2. `Author Shared Key`

The product must stay easy to start, clear to pay for, and resilient when a user has already synced access data at least once.

---

## 2. Product Positioning

### Core promise

Developer Assistant gives users a better prompt-writing workflow without forcing a single purchasing model.

Users can either:

- connect their own supported AI account and pay their chosen provider directly
- subscribe to a managed hosted experience and use the author's shared access

### Commercial intent

The business model is designed to support:

- immediate free-to-start adoption through BYOK
- a low-friction paid upgrade for convenience
- pricing and provider choice that can evolve without shipping a new extension release for every model change

---

## 3. Access Model

### 3.1 Bring Your Own Key

BYOK is the default path.

Characteristics:

- no login required
- no subscription required
- users save their own provider API key locally
- users choose from supported providers approved by the platform
- users send optimization requests using their own external AI spend

Supported provider families:

- OpenAI
- Claude
- DeepSeek
- Gemini
- Grok

### 3.2 Author Shared Key

Author Shared Key is the managed hosted subscription path.

Characteristics:

- sign-in required
- active subscription required
- billing handled through Stripe
- the user does not manage their own provider API key for hosted optimization
- the hosted provider can change behind the scenes without changing the public commercial offer

### 3.3 Relationship Between Paths

- both paths can coexist in the same product
- login must never be required just to use BYOK
- subscription status only controls hosted access
- users can move between BYOK and Author Shared Key without reinstalling or resetting the product
- if hosted access becomes unavailable, the product should continue to guide the user toward BYOK rather than dead-ending the experience

---

## 4. Backend-Driven Access Catalog

### Source of truth

The backend owns the access catalog for the popup.

The extension should treat the backend catalog as the commercial source of truth for:

- supported provider list
- model choices shown for each provider
- default model presented for each provider
- shared hosted offering label and price
- server-side cache metadata for discovery data

### Why this matters

The product should not hardcode model availability in the extension UI because provider catalogs change often and marketing promises should stay aligned with real availability.

Business outcome:

- users see provider/model choices that reflect the current supported market offer
- the product can update default recommendations without waiting for a browser-store release
- pricing and discovery copy remain consistent across popup sessions

### Default model policy

For each supported provider, the backend selects a default based on the latest stable public model listing from that provider's official documentation or reference pages.

Business rule:

- default to the latest stable model
- do not default users to preview, experimental, or clearly unstable model lines

This keeps the default choice current while avoiding surprise quality or availability swings from non-stable releases.

---

## 5. Live Discovery And Server Cache Behavior

### Discovery data

The extension requests the backend access catalog for access discovery, including:

- supported providers
- available models
- default models
- hosted monthly price
- server-side cache metadata for that catalog

### Cache ownership

Catalog caching belongs on the backend.

The extension should not persist catalog snapshots in `localStorage`, the browser Cache API, or IndexedDB. This keeps popup behavior easier to debug and keeps Redis or the configured server cache as the catalog cache layer.

### Offline business behavior

If the extension cannot reach the backend, it should show a clear catalog loading error instead of falling back to a persisted frontend catalog snapshot.

Expected user experience:

- saved BYOK settings can still appear because they are user settings
- provider/model catalog controls remain limited until the backend catalog loads
- hosted price and offering availability come from the backend, not client persistence
- users can retry catalog loading when connectivity returns

---

## 6. Pricing And Billing

### Hosted offer

Author Shared Key is sold as a recurring monthly subscription.

Pricing rules:

- price is shown in Australian dollars
- the default commercial position is `A$2/month`
- the actual displayed price remains backend-configurable
- user-facing surfaces should present the current configured price rather than assuming a fixed lifetime amount

### Billing provider

Stripe handles:

- checkout
- subscription creation
- renewals
- payment collection
- cancellations
- payment method updates
- billing portal flows when available

### Commercial framing

BYOK is the cost-control path.

Author Shared Key is the convenience path.

This distinction should stay obvious in product messaging:

- BYOK appeals to users who already manage provider spending
- Author Shared Key appeals to users who want the simplest setup with predictable low-friction entry pricing

---

## 7. Access Rules

### BYOK rules

- no sign-in required
- user supplies their own provider key
- user can choose from the currently supported providers and models published in the backend catalog
- if a saved model is no longer available, the product should fall back to that provider's current default model

### Hosted rules

- sign-in required
- active subscription required
- hosted optimization should be presented as `Shared Hosted` or `Author Shared Key`, not by naming the upstream provider in customer-facing UI

### Fallback rules

If hosted access is inactive or unavailable:

- hosted optimization must be disabled
- recovery actions such as subscribe, renew, or manage billing should remain visible
- BYOK should remain available as the fallback path

---

## 8. Customer Journeys

### 8.1 New user with BYOK

1. User installs the extension.
2. User sees that BYOK is available immediately.
3. User chooses a supported provider.
4. User selects a currently available model from the backend-managed catalog.
5. User saves their own key locally.
6. User uses Prompt Optimizer without creating an account.

### 8.2 New user upgrading to Author Shared Key

1. User installs the extension.
2. User sees the hosted subscription option and current monthly price.
3. User signs in.
4. User completes Stripe checkout.
5. The product refreshes access state.
6. Hosted optimization becomes available without the user needing to manage a personal API key.

### 8.3 Returning user without connectivity

1. User has previously opened the extension while online.
2. User later opens the extension without connectivity.
3. The extension shows saved local access settings where available.
4. The extension shows that the provider catalog cannot be loaded until the backend is reachable.

### 8.4 Returning subscriber with inactive billing

1. User signs in.
2. The extension detects hosted access is inactive.
3. The hosted path is shown as unavailable until billing is recovered.
4. The product offers billing recovery actions.
5. The user can still continue with BYOK if they choose.

---

## 9. Prompt Optimizer Positioning

Prompt Optimizer remains the first commercial feature across both access paths.

The business promise is the same regardless of access mode:

- users provide a rough request
- Developer Assistant returns a clearer, more structured prompt
- the improved prompt is ready to copy into the user's preferred AI tool

The product should not frame Prompt Optimizer as locked to a single downstream agent type. It should support broader use cases such as:

- general requests
- design work
- technical planning
- solution architecture
- testing strategy
- deployment planning

---

## 10. Messaging Requirements

### Access panel framing

The popup should make the two paths obvious:

- `Use Your Own Key`
- `Use Author Shared Key`

### BYOK messaging principles

- emphasize immediate access
- emphasize provider choice
- emphasize that no sign-in is required

### Hosted messaging principles

- emphasize convenience
- emphasize subscription requirement
- emphasize that the user is using shared hosted access rather than managing a personal key
- avoid naming the hidden upstream provider in public UI copy

### Discovery messaging principles

When catalog data cannot be loaded from the backend, the product should communicate that calmly and clearly.

Good framing:

- the provider catalog is unavailable right now
- pricing and model availability load from the backend

Bad framing:

- technical cache jargon
- messages that imply the product can verify model or pricing data while offline

---

## 11. Security And Trust Expectations

### BYOK trust promise

- user-managed keys stay local
- the product does not require an account just to use BYOK
- the product should not imply that the user's provider relationship is transferred to Developer Assistant

### Hosted trust promise

- hosted optimization runs only for entitled subscribed users
- the author's shared access is not exposed as a raw key to the user
- billing state should be clear enough that users understand why hosted access is or is not available

### Discovery trust promise

- provider/model discovery should reflect curated backend support, not arbitrary frontend guesses
- frontend code should not persist provider catalog snapshots for offline discovery

---

## 12. Non-Goals For This Product Slice

Out of scope for the current commercial model:

- usage-based hosted billing
- annual plans
- team billing
- offline catalog discovery guarantees
- customer-facing promises that every provider's newest experimental release will appear immediately

---

## 13. Acceptance Criteria

The product behavior is correct when:

- BYOK is still available without sign-in
- supported providers are platform-defined and consistently presented
- model choices and default recommendations come from the backend access catalog
- the hosted offer price shown in the extension matches backend-configured pricing
- the hosted path is framed as Author Shared Key or Shared Hosted access rather than exposing the hidden upstream provider
- frontend code does not cache the access catalog in localStorage, the browser Cache API, or IndexedDB
- catalog unavailability is shown as a backend loading problem rather than an offline cached state
- inactive hosted subscribers are guided toward recovery or BYOK fallback instead of facing a blocked product
