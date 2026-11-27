# Established software behavior and frontier questions

**Evidence date: 2026-11-27**

This boundary applies only to the agent-run synthetic software exchange checkpoint recorded in
[VERIFICATION.md](VERIFICATION.md). It is not a biological validation record or a publication
approval.

## Established in the reproduced software checks

- The pre-merge exchange checkpoint completed `npm test` with **352 passing tests**, zero failures
  and zero skipped tests, and `npm run check` syntax-checked **182 project modules**.
- After the normal merge, final commit `2f25281c57256900bea20f5d343441ea09df6037` again passed
  `npm test` with **352 passing tests**, zero failures and zero skipped tests; its final tree's
  `npm run check` syntax-checked **183 project modules**.
- The archived synthetic browser download remained exactly **3,889 bytes**, with SHA-256
  `ef4319aa7c213a0293a72ae94ca2ac773d50934522ff647161a961dddf2bf904`; its sidecar remained
  exactly **25 bytes**, with SHA-256
  `91f6a1f8192c4fcbe810d51149109fbc22256486f55c20376f4638dff2dc4b07`.
- Native export identity checks rejected conflicting descriptors, wrong byte sizes and incorrect
  SHA-256 values. The synthetic artifact checks established byte identity only.
- Chromium with ANGLE/SwiftShader passed the presentation and exchange checks. With WebGL disabled,
  the fallback appeared and presentation was explicitly blocked while the non-graphical exchange
  checks still passed with identical bytes.
- Both graphics-mode runs reported **zero external requests** and zero page errors. The exchange
  remained local and synthetic; no external service or credentials were used.

## Frontier and not established

- Biological outcomes, biological efficacy and biological safety.
- Physical printer performance, manufactured-construct performance or physical reproducibility.
- Clinical readiness, treatment readiness, transplant readiness or suitability for use in people or
  animals.
- Behavior in Firefox, WebKit, other browser versions, physical devices or assistive-technology
  review; only the recorded Chromium environment was exercised.
- Owner visual review, owner acceptance and publication approval.

## Update when evidence changes

Update this document and the linked verification record whenever new evidence changes a result,
adds a tested environment, or alters a fixture identity. Keep reproduced software behavior separate
from frontier claims: record the exact command, environment, date and outcome, and do not promote a
frontier item without corresponding evidence and the required owner or expert review.
