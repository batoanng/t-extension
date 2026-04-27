---
name: purposeful-logging
description: Use when adding, reviewing, or reducing application logging so every log line has incident value, carries structured context, and competes correctly with metrics and traces. Apply this when instrumenting request flows, background jobs, retries, queues, integrations, and error paths; when converting free-text logs to structured events; and when removing noisy DEBUG or INFO narration that adds cost without improving diagnosis.
---

# Purposeful Logging

Use this skill when logging needs to help incident response, debugging, or business understanding instead of narrating execution.

Prefer fewer, richer events over high-volume chatter. A useful log line is evidence, not commentary.

Read [references/logging-decisions.md](references/logging-decisions.md) when you need a sharper log-vs-metric-vs-trace decision guide, schema examples, or examples of noisy logs to remove.

## Workflow

1. Start with the question the log must answer during an incident, investigation, or audit.
2. Identify the system boundary or state transition being instrumented: request, job, queue message, retry, external call, persistence write, security decision, or user-visible outcome.
3. Decide whether the signal belongs in a log, metric, or span before adding code.
4. Keep only events that explain a meaningful outcome, abnormal condition, state change, or business-significant action.
5. Emit structured logs with stable field names and a recognizable event or operation name.
6. Include enough context to reconstruct the moment: trace ID, span ID, request ID, user or tenant identifier, job or message identifier, target dependency, relevant inputs, outcome, and duration when appropriate.
7. Choose severity based on the human response required, not on how surprising the code path felt while writing it.
8. Collapse repetitive progress chatter into one higher-value start, completion, or failure event when possible.
9. Gate temporary deep diagnostics behind DEBUG or TRACE and remove or disable them before finishing unless the system genuinely requires that verbosity.
10. If the stack supports ingestion filters or collector rules, drop low-value events as early as possible.

## Decision Rules

- Log events that help explain failures, retries, fallbacks, degraded behavior, boundary crossings, security-sensitive actions, and business-significant outcomes.
- Do not log routine function entry or exit, per-line progress, loop iterations, raw local variables, or other messages that would never be searched during an incident.
- Prefer one completion log with outcome, status, duration, and identifiers over multiple progress logs that say little on their own.
- Use spans for latency, causality, and cross-service request flow.
- Use metrics for counts, rates, saturation, alert thresholds, and repetitive high-frequency events.
- Treat logs as structured data first. Prefer JSON or stable key-value fields over ambiguous free text.
- Include correlation identifiers whenever the platform provides them, especially OpenTelemetry trace and span IDs.
- Redact or omit secrets, tokens, credentials, and unnecessary personal data.
- `ERROR` means the system is broken enough that a human may need to act now.
- `WARN` means unexpected but survivable behavior that deserves later investigation.
- `INFO` means a routine but meaningful lifecycle or business event.
- `DEBUG` and `TRACE` are temporary or highly specialized diagnostics and should rarely remain enabled in production.

## Preferred Shape

Aim for a stable schema such as:

```json
{
  "event": "invoice.finalized",
  "severity": "INFO",
  "trace_id": "9d0d...",
  "span_id": "7ac1...",
  "request_id": "req_123",
  "tenant_id": "team_42",
  "invoice_id": "inv_987",
  "duration_ms": 182,
  "outcome": "success"
}
```

Keep message text short and factual. Put filterable detail into fields.

## Pitfalls

- Logging because a code path feels important instead of because the event answers a real diagnostic question
- Shipping free-text logs with no identifiers or operation names
- Emitting the same warning or info line hundreds of times per second
- Using `ERROR` for expected validation failures or user mistakes
- Measuring latency with log timestamps instead of spans or metrics
- Leaving temporary debug logging in hot paths

## Output Expectations

When you finish a task that uses this skill, state:

- Which events were added, changed, or removed
- Why each remaining log line earns its place
- Which signals were moved to metrics or spans instead of logs
- What context fields were included for correlation
- Any remaining noise, redaction risk, or observability gaps that still need follow-up
