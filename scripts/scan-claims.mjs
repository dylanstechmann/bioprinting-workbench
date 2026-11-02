import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** In-repo claims-language scanner: mechanically flags overclaim, procedure-imperative and human-outcome language in authored source text. A scripted honesty check, not a substitute for external review. */
export const CLAIM_PATTERNS = [
  { name: 'outcome-assertion', severity: 'high', negationWindow: 80, pattern: /\b(will|shall|guarantees?|guaranteed)\s+(cure|regenerate|restore|heal|repair)\b/gi },
  { name: 'clinical-certainty', severity: 'high', negationWindow: 80, pattern: /\bclinically\s+proven\b/gi },
  { name: 'imperative-procedure', severity: 'high', negationWindow: 80, pattern: /\byou\s+(should|must)\s+(inject|take|administer|implant|dosing)\b/gi },
  { name: 'human-outcome-upgrade', severity: 'medium', negationWindow: 80, pattern: /\b(safe|established|proven|effective)\s+(for|in)\s+humans?\b/gi },
  { name: 'unsourced-human-claim', severity: 'medium', negationWindow: 80, pattern: /\b(humans|patients)\s+(are|can be|will be)\s+(cured|repaired|restored)\b/gi },
];
export const ALLOWLIST = [
  { file: 'index.html', reason: 'boundary-disclosure footer quotes the honesty boundary itself', test: text => text.includes('This interactive scene needs JavaScript') },
];
const NEGATION = /\b(not|no|never|nothing|neither|nor|unproven|unestablished|unknown)\b/i;
function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}
function contextAt(text, index, window = 80) {
  return text.slice(Math.max(0, index - window), index);
}
export function scanText(text, fileName) {
  const findings = [];
  for (const rule of CLAIM_PATTERNS) {
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.negationWindow && NEGATION.test(contextAt(text, match.index ?? 0, rule.negationWindow))) continue;
      findings.push({ finding: match[0].trim(), file: fileName, line: lineAt(text, match.index ?? 0), pattern: rule.name, severity: rule.severity });
    }
  }
  return findings;
}
export function scanClaims(directory) {
  const srcDir = join(directory, 'src');
  const files = readdirSync(srcDir).filter(f => f.endsWith('.js'));
  const findings = [];
  const reviewed = [];
  for (const f of files) {
    const text = readFileSync(join(srcDir, f), 'utf8');
    const fileFindings = scanText(text, f);
    const allow = ALLOWLIST.find(a => a.file === f && a.test(text));
    for (const finding of fileFindings) {
      if (allow) reviewed.push({ ...finding, reviewedReason: allow.reason });
      else findings.push(finding);
    }
  }
  return {
    schema: 'bioprinting-workbench/claims-scan/1',
    findings,
    reviewed,
    summary: `Scanned ${files.length} authored source files: ${findings.length} unreviewed finding(s), ${reviewed.length} reviewed. Unreviewed findings fail the release check.`,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = scanClaims(dirname(fileURLToPath(import.meta.url)) + '/..');
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
