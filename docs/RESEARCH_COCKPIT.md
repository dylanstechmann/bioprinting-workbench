# Research cockpit (Phase E)

Personal hobby/learning project, AI-assisted. The cockpit is an **offline, in-memory draft
workspace** with explicit file save/load. No localStorage, no repository writes, no network.
Cards are software records about questions — review status (`unreviewed|owner-reviewed`) is
metadata and **never** means scientific validation.

## Records (`src/hypothesis-workspace.js`)

`HypothesisCard` requires 2–8 competing alternatives, each with its own prediction and
falsifier (matching ResearchDesk's competing-hypothesis requirement). Drafts may lack
predictions/falsifiers and are preserved un-fabricated; `ready-for-review` is blocked until
both lists exist. Contradicting evidence ids are retained alongside supporting ones.
`generateHypothesisCandidates` produces deterministic prompt templates (artifact, transport,
assumption, unmodeled-process, …) — prompts for a human, never autonomous discoveries.
`buildQueryPlans` emits `planned`-only query plans with a disclosure that local text stays
private until explicitly selected for exchange.

## UI (`src/research-cockpit-ui.js`)

- All dynamic text renders through `textContent` (XSS strings render inert — pinned by test);
  no innerHTML, no Markdown execution, no credential-bearing links.
- Import is **preview-first**: `cockpit-preview` shows creates/duplicates/conflicts/warnings
  from `previewResearchImport` before any change exists; the Apply button stays disabled on
  blocked previews; applying constructs new state and never submits anything anywhere.
- Export renders the validated bundle as text for the user to save explicitly. Bundles always
  carry `publicationReviewStatus: not-approved`; the schema has no private-notes field.

## State boundaries

Cockpit state is separate from scenario /13 (scenario export excludes cockpit content) and
separate from presentation state. `createResearchCockpitUI({elements, workspace, onChange})`
takes an optional `createHypothesisWorkspace` as seed and reports new states via `onChange`;
`dispose()` removes every listener.

## Known limits

Workspace-shell deep links (`research-module-*`) are unchanged in this phase; the
Library/Cockpit sub-navigation remains the Research area's own content ordering rather than a
new hash-fragment scheme. Live provider execution is deliberately absent (Phase G is
mock-first and opt-in). The ≥ 10-cycle resource matrix and owner visual review remain the
standing Phase A gaps.
