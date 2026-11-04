# Bioprinting Workbench

Personal hobby and learning project developed with AI assistance. Only one editing agent at a time.
Keep published evidence, synthetic calculations, and conceptual animation distinct.
No person/animal-directed treatment instructions, transplant-readiness scores, or claims of
biological validation. Preserve the visible limitations and software credits.
Procedure and method-recipe content is owner-approved (2026-11-01, revised the same day by an
explicit owner instruction authorizing actionable laboratory recipes). It may restate published
open-access method parameters (concentrations, times, volumes, device settings) as cited
third-person research reference content. Every parameter must trace to a primary source the
development agent actually opened, with locator; nothing may be directed at treating any person
or animal; no safety, validation or transplant-readiness claims may be made; unknowns stay
visible; and in-vivo research is described only as published findings, never as surgical
guidance.
Use original procedural geometry; do not redistribute vendor CAD or paper figures without permission.
Run `npm test` and `npm run check`, then inspect the browser including WebGL failure behavior.
No secrets, analytics, patient data, or server-side execution endpoints.

## Agent tooling (portable across harnesses)

<!-- agent-toolbox:installed -->

This repo vendors its agent tooling (no secrets inside) so Claude Code,
Cline, Codex, OpenCode, Kilo Code, Kimi Code and Grok share one setup:

- `.mcp.json` — project MCP servers:
  `scholar` (PubMed, OpenAlex, Semantic Scholar, CORE, ORCID, Crossref),
  `web` (Exa, Brave, Jina, Firecrawl), `github` (read-only, token via
  `gh auth token`), `context7` (library docs), `playwright` (browser).  Also `blender` (Blender MCP; needs the addon running).
- `opencode.json` — the same servers for OpenCode;
  `AGENT_TOOLS.md` has merge snippets for Codex / Cline / Kilo Code and
  CLI fallbacks for Kimi / Grok.
- `.claude/skills/` — project skills: citation-check, literature-search, web-research, secrets-guard, regen-guardrails, fold-providers.
- Keys: `~/.config/ai-keys.env` via the `agentkeys` loader — never in git,
  MCP config or chat. Run `secrets-guard` (`--staged`) before committing.
