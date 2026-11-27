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
- When `onEditCard` is supplied, each hypothesis gets an `Edit <id>` button. Its one delegated
  listener finds the latest cockpit-state card and passes a defensive clone to the callback. It
  does not apply an import, change a selection, prepare a download or mutate a scenario; dispose
  removes the listener.

## Visible draft editing (`src/research-draft-ui.js`)

Local records have `draft-edit-<id>` controls and cockpit records have `cockpit-edit-<id>`
controls. Both routes populate the same complete editor, including every card field and all 2–8
alternatives. `loadExternalCard(card)` synchronously applies
`validateHypothesisCard(card, {allowDraft:true})` and clones the validated record into an immutable
private baseline. Loading only changes the visible editor: it does not add/update workspace state,
apply a scenario, generate/execute a query, mark review or Save implicitly. In particular,
`authorship.createdBy: "import"`, lineage/evidence/query-reference arrays and the original creator
survive the round trip.

Only explicit Save persists. Before writing a same-ID record, Save compares the complete current
workspace record with the immutable loaded baseline. Any difference—including an intervening
workspace update or a conflicting external card—refuses the write with a conflict/reload diagnostic.
This optimistic-concurrency check prevents stale content from inheriting the current record's owner
review. For an accepted Save, review preservation is determined against the actual final target:
only an identical editable projection retains owner review, while changed target content clears
`reviewStatus` to `unreviewed` and `reviewedBy` to `null`.

Save does not auto-increment `revision` and replaces the baseline with the actual validated record
accepted by the workspace. A new record is unreviewed and the original creator is retained even if
the visible creator control is changed. List controls retain the exact populated serialization; if
that control is untouched, the baseline array is cloned verbatim rather than lossily joined/split.
Thus padding, embedded newlines and comma-containing entries survive an unchanged Save. Only a
control whose serialization actually changed is parsed. Dynamic text remains `textContent`-only and
each card list uses one delegated click listener across rerenders.

### Observed drafts browser evidence — regenerated 2026-11-16

`docs/browser-controls-2026-11-15.json` is output from real headless Playwright Chromium
155.0.8059.12 runs against the loopback app. The `drafts` part passed **9/9 checks with zero page
errors** independently at 1280×720, 390×844 and 1280×720 with WebGL disabled before application
startup. The checks cover local create/load/edit/Save, invalid-Save refusal, preview/Apply, full
imported load with inertness before explicit Save, an imported-title edit before Save, retained
neighboring drafts, planned-only query generation with zero external requests, and selected export
with exact 2,626-byte downloaded-bundle comparison. The actual downloaded JSON is asserted to retain
that edited title, original creator, lineage/reference arrays and revision, with unreviewed metadata
and a null reviewer. Canonical scenario serialization remains unchanged at 2,955 bytes and no
horizontal overflow occurred.
Disabled WebGL did not block this non-graphical workflow. These are software DOM checks, not owner
visual review or scientific validation; other browser parts were not run in this increment.

## State boundaries

Cockpit state is separate from scenario /13 (scenario export excludes cockpit content) and
separate from presentation state. `createResearchCockpitUI({elements, workspace, onChange, onEditCard})`
takes an optional `createHypothesisWorkspace` as seed and reports new states via `onChange`;
`dispose()` removes every listener.

## Known limits

Workspace-shell deep links (`research-module-*`) are unchanged in this phase; the
Library/Cockpit sub-navigation remains the Research area's own content ordering rather than a
new hash-fragment scheme. Live provider execution is deliberately absent (Phase G is
mock-first and opt-in). Only the `drafts` browser part is claimed for the 2026-11-16 rerun; other browser
parts, a ≥ 10-cycle resource matrix, non-Chromium engines, physical devices, assistive-technology
review and owner visual review remain separate gaps.
