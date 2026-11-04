import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateResearchBundle } from '../src/research-exchange.js';

const corpus = JSON.parse(readFileSync(new URL('../tests/fixtures/research-exchange/parity-cases.json', import.meta.url)));
const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/research-exchange/roundtrip.json', import.meta.url)));
const deskRoot = resolve(process.env.RESEARCH_DESK_ROOT ?? fileURLToPath(new URL('../../regen-workbench', import.meta.url)));
const python = process.env.PYTHON ?? 'python3';
let failures = 0;
for (const item of corpus) {
  const input = structuredClone(fixture);
  if (item.operation === 'duplicate') input[item.group].push(structuredClone(input[item.group][0]));
  if (item.operation === 'timestamp') input.createdAt = item.value;
  if (item.operation === 'nested-alt-extra') input.hypotheses[0].alternatives[0].ghost = 1;
  if (item.operation === 'nested-alt-type') input.hypotheses[0].alternatives[0].prediction = 42;
  if (item.operation === 'query-dangling-ref') input.queries[0].hypothesisId = 'ghost-hyp';
  if (item.operation === 'artifact-sha-format') input.artifacts[0].sha256 = 'NOTHEX';
  if (item.operation === 'diamond') {
    const template = input.hypotheses[0];
    input.hypotheses = ['hyp-a', 'hyp-b', 'hyp-c', 'hyp-d'].map(id => ({ ...structuredClone(template), id, parentHypothesisIds: [] }));
    input.hypotheses[1].parentHypothesisIds = ['hyp-a'];
    input.hypotheses[2].parentHypothesisIds = ['hyp-a'];
    input.hypotheses[3].parentHypothesisIds = ['hyp-b', 'hyp-c'];
  }
  if (item.operation === 'cycle') input.hypotheses[0].parentHypothesisIds = ['hyp-b'];
  let js = 'accept';
  try { validateResearchBundle(input); } catch { js = 'reject'; }
  const script = 'import json,sys; sys.path.insert(0,sys.argv[1]); import bioprint_exchange as bx\ntry:\n bx.validate_bundle(json.load(sys.stdin)); print("accept")\nexcept (ValueError,TypeError,KeyError):\n print("reject")';
  const result = spawnSync(python, ['-B', '-c', script, resolve(deskRoot, 'tools')], { input: JSON.stringify(input), encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) throw new Error(`Python parity runner failed: ${result.error?.message ?? result.stderr}`);
  const py = result.stdout.trim();
  const pass = js === item.expected && py === item.expected;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${item.id}: JS=${js} Python=${py} expected=${item.expected}`);
}
if (failures) process.exitCode = 1;