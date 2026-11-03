# Research exchange contract (Phase E, normative)

Personal hobby/learning project, AI-assisted. Schema `bioprinting-workbench/research-exchange/1`.
Bundles are explicit local files moved by the user between the offline Workbench and the local
ResearchDesk (`/workspace/regen-workbench`). Nothing uploads automatically; no provider is
called by any Workbench code; imported bundles always carry `publicationReviewStatus:
not-approved`. Hashes attest byte integrity only — never scientific validity — and review
status is software metadata, never a validation claim.

## Bundle shape

`{schema, bundleId, createdAt, producer, sourceRevision, hypotheses, queries, modelRuns,
evidence, artifacts, privacyClassification, publicationReviewStatus}`

- Manifest ≤ 5 MiB UTF-8; JSON nesting ≤ 20; ≤ 100 hypotheses/queries/model runs; ≤ 500
  evidence records/artifacts. Prototype-pollution keys (`__proto__`, `prototype`,
  `constructor`) are rejected at every level.
- Hypotheses are full `HypothesisCard` records (2–8 competing alternatives; drafts preserved
  un-fabricated). Hypothesis ancestry (parent ids) must be closed inside the bundle and acyclic.
- Queries are `QueryPlan` records in `planned|not-supported` state only; the Workbench never
  queues a job.
- Model runs may be **foreign**: unknown model IDs are retained as `unsupported-foreign`
  metadata and are never executed, overlaid or upgraded.
- Evidence records carry `sourceClass` (`primary-source|secondhand|synthetic-fixture|
  unreviewed-lead`) and `reviewState` (`unreviewed|owner-reviewed`); import never changes them.
- `privacyClassification` is `private|selected-for-exchange`; there is no secret/notes field —
  private notes cannot leak because the schema cannot hold them.

## Artifacts

`{id, filename, mediaType, bytes, sha256, provenance}`: flat basenames
`[A-Za-z0-9][A-Za-z0-9_.-]{0,95}` (no traversal, slashes, drive prefixes or encoded
separators), media types `application/json|text/csv|text/markdown|image/png`, ≤ 10 MiB each
and ≤ 25 MiB selected total. `verifyArtifactFiles(bundle, files)` byte-counts before hashing
exact bytes; a descriptor alone is metadata-only until its file hash matches. No ZIP
extraction, no URL fetching, no filesystem paths from callers.

## Import semantics

`previewResearchImport(bundle, state)` performs **no writes** and returns
`{bundleSha256, creates, duplicates, conflicts, warnings, blockedReasons, expectedStoreSha256}`:

- exact id+hash match → `duplicates` (idempotent no-op on apply);
- same id, different bytes → `conflicts` (apply refuses until resolved);
- unknown ids → `creates`.
`applyResearchImport(preview, state, bundle)` binds the preview to both the current store hash
and the exact bundle bytes; any drift rejects as stale. Apply constructs a **new state**
(never a partial mutable merge). `exportResearchBundle(selection, context)` emits a validated
subset with explicit privacy and `not-approved` publication.

## Cross-language rule (Phase F)

Python (`regen-workbench/tools/bioprint_exchange.py`) validates the same bounds and hashes
**exact producer bytes**. JS/Python float formatting is not assumed identical: exchanged
records are hashed as the producer serialized them; normalized semantic comparison is
separate. Golden fixtures under `tests/fixtures/research-exchange/` are byte-copied to
`regen-workbench/tests/fixtures/bioprint_exchange/` and must parse identically on both sides.

## Known limits

This file is the software contract; it is not a scientific or legal review. Fixture bundles
contain synthetic software examples only, no claimed research runs. The Desk-side import
ledger, atomicity and route limits are specified in `regen-workbench/BIOPRINT_EXCHANGE.md`.
