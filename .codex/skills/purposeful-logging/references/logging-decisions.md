# Logging Decisions

Use this reference when the main skill needs more explicit heuristics, examples, or a quick review checklist.

## The Core Test

Before adding a log line, ask:

- What concrete investigation question will this answer?
- Would I actually search for this during an incident?
- Could a metric or span express this better?

If the answer is no, do not log it.

## What Usually Deserves A Log

- Request or job completion when the outcome is materially important
- Failures with enough context to explain the failing operation
- Retry exhaustion, circuit breaking, fallback activation, and partial degradation
- Boundary events around external APIs, queues, databases, storage, and authentication
- Security-relevant actions such as permission denials or policy decisions
- Business-significant events such as order placement, payout failure, or invoice finalization

## What Usually Does Not

- Function entry or exit
- "Made it here" progress breadcrumbs
- Loop iteration counts
- Repeated variable dumps
- Repetitive success logs in hot code paths
- Warnings that are neither actionable nor unexpected

## Log, Metric, Or Span

Use a log when you need narrative evidence for one specific event.

- Good fit: why a payment failed, why a retry stopped, which dependency returned an invalid payload

Use a metric when you need aggregation, alerting, or high-frequency counting.

- Good fit: request rate, queue depth, retry counts, validation failure rate, cache hit rate

Use a span when you need duration, parent-child relationships, or cross-service causality.

- Good fit: API latency, DB query timing, request fan-out, downstream timeout analysis

If you are logging the same message over and over to count something, replace it with a metric.
If you are logging start and end timestamps to estimate duration, replace it with a span or timing metric.

## Severity Calibration

- `ERROR`: broken behavior, failed obligations, or situations that may require immediate human attention
- `WARN`: degraded or surprising behavior that recovered or remains survivable
- `INFO`: meaningful lifecycle or business events that operators may reasonably inspect later
- `DEBUG` or `TRACE`: temporary or specialist diagnostics that should be gated, sampled, or disabled outside focused investigation

Do not promote a message to a higher level just to make it easier to find.

## Structured Logging Checklist

Prefer fields like:

- `event`
- `severity`
- `message`
- `trace_id`
- `span_id`
- `request_id`
- `user_id` or `tenant_id`
- `job_id` or `message_id`
- `operation`
- `dependency`
- `status` or `outcome`
- `duration_ms`
- domain identifiers such as `order_id`, `invoice_id`, or `workspace_id`

Keep field names stable across call sites so queries remain simple.

## Good And Bad Examples

Bad:

```text
INFO User clicked button
DEBUG entering processOrder
WARN request failed
```

Better:

```json
{
  "event": "checkout.submit_failed",
  "severity": "WARN",
  "trace_id": "9d0d...",
  "request_id": "req_123",
  "user_id": "usr_456",
  "order_id": "ord_789",
  "dependency": "payments",
  "outcome": "retrying",
  "attempt": 2,
  "error_code": "gateway_timeout"
}
```

## Noise Reduction Tactics

- Merge multiple low-value progress logs into one completion or failure event
- Move counts and rates into metrics
- Move latency and causality into spans
- Sample or filter verbose diagnostics at source, collector, or ingest layer
- Remove temporary debug statements once the hypothesis is proven

## Review Prompts

When reviewing existing logging, ask:

- Which of these lines would materially help root cause analysis?
- Which lines are just proving that the code ran?
- Which messages lack identifiers needed to join logs to traces or user reports?
- Which repeated lines should become metrics?
- Which timing logs should become spans?
- Which fields create avoidable privacy or secret leakage risk?
