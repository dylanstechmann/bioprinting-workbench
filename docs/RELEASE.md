# Local candidate review and publication boundaries

Current development version: **0.25.0-dev**, unpublished. This personal learning project is
AI-assisted; software verification is agent-run and does not establish biological validation.

## Authorization

Implementation approval is not permission to commit, tag, push, create a release or deploy.
The last read-only Pages inspection showed legacy **main / root** publication. A push to
main may publish automatically. Recheck configuration immediately before any separately
authorized publication. Do not add an automatic workflow or copy a repository wholesale.

No commit or deployment is performed by `npm run verify:release`. It runs local tests,
syntax, version consistency, evidence-contract, asset hashes and whitespace checks and
builds an allowlisted candidate inventory. Optional report:

```sh
cd /workspace/bioprinting-workbench
npm run verify:release -- --out /tmp/bioprint-release-verification.json
```

Do not call a candidate release approved because this command succeeds: browser checks,
source support, claims review, Blender isolation, owner authorization and deployment are
explicitly **not-run** by this script. `candidateCommit` is null for the uncommitted tree.
Inventory paths are project-relative. No `.git`, credentials, `.env`, tests, Python authoring
scripts or temporary reports should be published. Preserve project and vendored licenses.

## Before requesting release approval

1. Inspect guidance, sole-editor ownership, tracked **and untracked** source, binary hashes
   and exact candidate diff; preserve existing implementation and history.
2. Run `npm test`, `npm run check`, `npm run verify:release`, Python compilation without
   bytecode, citation resolution/support checks, claims review and `git diff --check`.
3. Run bounded browser smoke/failure cases, including Pages-style subpath, blocked asset,
   blocked worker, no WebGL, migration and the candidate's actual scenario download.
4. Inspect preview/layout, keep AI disclosure and evidence limitations. Record actual
   results and not-run cases in VERIFICATION.md. A HIGH disclosure false positive is a
   reviewed exception, never a clean scan or a reason to remove the disclosure.
5. Present version, staged-file proposal, known limitations and last-known-good revision.
   Ask for specific commit/push/publication authorization, not generic feature approval.

Only after authorization, finalize versions/notes and reviewed commit, verify Pages source
and publish within granted scope. Confirm deployed revision and live subpath worker,
four assets, evidence panels, recipe cards, /4 download/restore and old-version migration. Reverting or
redeploying the recorded prior revision is also a publication action needing permission.
Never claim the published v0.3 site changed based on local tests alone.