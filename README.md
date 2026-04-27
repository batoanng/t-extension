# Developer Assistant Chrome Extension

Developer Assistant is a Chrome extension for people who want to turn rough requests into stronger prompts before sending work to AI assistants.

## Business Model

Developer Assistant has two customer paths:

- `Bring Your Own Key`: users connect their own supported AI provider account and pay that provider directly.
- `Author Shared Key`: users subscribe to a managed hosted experience and use the author's shared access instead of managing a personal API key.

This keeps the product free to start while creating a simple paid upgrade for convenience.

## Access Experience

### Bring Your Own Key

- available immediately after install
- no sign-in required
- built for users who already manage AI spend elsewhere
- supports platform-approved providers, with current model choices managed by the backend catalog

### Author Shared Key

- built for users who want the simplest setup
- requires sign-in because hosted access is tied to subscription state
- uses Stripe for recurring billing
- positioned at `A$2/month` by default, while remaining configurable by the business

## Backend-Driven Access Catalog

Developer Assistant does not treat provider and model discovery as static extension copy.

Instead, the product relies on a backend-managed access catalog that defines:

- which providers are currently supported
- which model choices are available for each provider
- which model is recommended as the default for each provider
- what hosted monthly price should be shown

Business outcome:

- the extension can keep current provider/model options without requiring a browser-store update for every catalog change
- the default recommendation can follow the latest stable public model from each supported provider
- pricing and access messaging stay aligned with the live commercial offer

## Offline-Cached Discovery

After at least one successful sync, the extension keeps the latest access catalog available locally.

That means users can still open the product offline and see the last known:

- supported providers
- model choices
- hosted price
- saved access path context

This is a product reliability feature, not a promise of first-run offline setup. The goal is to keep access discovery understandable even when the network is unavailable.

## Billing And Access Rules

- login is required only for the hosted subscription path
- Stripe handles checkout, renewals, cancellations, and payment method updates
- an active subscription unlocks hosted prompt optimization
- if hosted access becomes inactive, users can still continue with Bring Your Own Key

## Current Offer

The first commercial feature is Prompt Optimizer:

- users enter a rough prompt
- Developer Assistant rewrites it into a clearer, more actionable request
- the result is ready to paste into the user's preferred AI assistant

Prompt Optimizer is designed for broader work than coding alone, including general requests, design work, technical planning, architecture, testing, and deployment planning.

## Product Direction

Near-term priorities:

- keep the two-path pricing story obvious in the extension
- make backend-managed provider and pricing discovery the source of truth
- preserve a dependable offline-cached experience after initial sync
- grow Author Shared Key into the main convenience upgrade

Longer-term opportunities:

- reusable prompt assets and saved workflows
- premium prompt libraries for common work types
- team-oriented paid features
- additional hosted capabilities beyond prompt optimization
