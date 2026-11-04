import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { getEvidenceCatalog, validateEvidenceCatalog } from '../src/cell-evidence.js';
import { getRepairResearchCatalog, validateRepairResearchCatalog } from '../src/repair-research.js';
import { getRecipeCatalog, validateRecipeCatalog } from '../src/method-recipes.js';
import { getMechanismCatalog, validateMechanismCatalog } from '../src/acceleration-theory.js';
import { getAgingEvidenceCatalog, validateAgingEvidenceCatalog } from '../src/aging-evidence.js';
import { getBarrierCatalog, validateBarrierCatalog } from '../src/longevity-theory.js';
import { getApplicationsEvidenceCatalog, validateApplicationsEvidenceCatalog } from '../src/applications-evidence.js';
import { getApplicationsLedger, getApproachCatalog, validateApplicationsCatalog } from '../src/applications.js';
import { getGeroscienceEvidenceCatalog, validateGeroscienceEvidenceCatalog } from '../src/geroscience-evidence.js';
import { getProgramNodes, validateProgramNodes } from '../src/research-program.js';
import { getHardwareCatalog, validateHardwareCatalog } from '../src/hardware-costs.js';
import { getTissueEvidenceCatalog, validateTissueEvidenceCatalog } from '../src/tissue-evidence.js';
import { getTissueTargets, validateTissueTargets } from '../src/tissue-atlas.js';
import { getScaffoldEvidenceCatalog, validateScaffoldEvidenceCatalog } from '../src/scaffold-evidence.js';
import { getScaffoldMethods, validateScaffoldMethods } from '../src/scaffold-methods.js';
import { scanClaims } from './scan-claims.mjs';
import { checkAuthoringIsolation } from './check-authoring-isolation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Development-history planning archives are not public runtime artifacts.
const PLANNING_ARCHIVES = new Set(['docs/IMPLEMENTATION_HISTORY_2026-11-03.md','docs/IMPLEMENTATION_PHASES_A_G_2026-11-03.md','docs/IMPLEMENTATION_PHASE_B_ONLY_2026-11-03.md','docs/IMPLEMENTATION_PLAN_ARCHIVE_2026-11-04.md','docs/IMPLEMENTATION_PLAN_CONTINUATION_ARCHIVE_2026-11-04.md','docs/IMPLEMENTATION_VERIFICATION_CLOSEOUT_2026-11-03.md','docs/IMPLEMENTATION_PROGRESS_2026-11-03.md','docs/IMPLEMENTATION_PROGRESS_2026-11-04.md']);
/** An allowlisted candidate inventory, NOT an instruction to publish the repo root. */
export function collectReleaseInventory(directory = root) {
  const files = [];
  function visit(path) {
    const rel = relative(directory, path).split(String.fromCharCode(92)).join('/');
    if (PLANNING_ARCHIVES.has(rel)) return;
    if (statSync(path).isDirectory()) { for (const name of readdirSync(path).sort()) if (!name.startsWith('.') && !['__pycache__','node_modules'].includes(name)) visit(resolve(path, name)); }
    else if (/\.(?:html|css|js|json|glb|png|md)$/.test(path) || /\/LICENSE(?:\.txt)?$/.test(path)) { const data = readFileSync(path); files.push({ path: relative(directory, path).replaceAll('\\','/'), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }); }
  }
  for (const name of ['index.html','src','assets','docs','vendor','LICENSE','.nojekyll']) {
    const path = resolve(directory, name);
    if (['LICENSE','.nojekyll'].includes(name)) { const data = readFileSync(path); files.push({ path: name, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }); }
    else visit(path);
  }
  return files;
}
export function verifyRelease(directory = root, { targetVersion = JSON.parse(readFileSync(resolve(directory,'package.json'),'utf8')).version } = {}) {
  const checks = [], check = (name, command, fn) => {
    try { fn(); checks.push({ name, status: 'pass', command, evidencePath: null, notes: 'Agent-run local software/artifact check only.' }); }
    catch (error) { checks.push({ name, status: 'fail', command, evidencePath: null, notes: error.message }); }
  };
  check('version consistency', 'verify-release version check', () => { if (!readFileSync(resolve(directory,'index.html'),'utf8').includes(`v${targetVersion}`)) throw Error('Footer/package version mismatch'); });
  check('evidence contract', 'validateEvidenceCatalog', () => validateEvidenceCatalog(getEvidenceCatalog()));
  check('repair-research contract', 'validateRepairResearchCatalog', () => validateRepairResearchCatalog(getRepairResearchCatalog()));
  check('method-recipes contract', 'validateRecipeCatalog', () => validateRecipeCatalog(getRecipeCatalog()));
  check('acceleration-theory contract', 'validateMechanismCatalog', () => validateMechanismCatalog(getMechanismCatalog(), getEvidenceCatalog()));
  check('aging-evidence contract', 'validateAgingEvidenceCatalog', () => validateAgingEvidenceCatalog(getAgingEvidenceCatalog()));
  check('longevity-theory contract', 'validateBarrierCatalog', () => validateBarrierCatalog(getBarrierCatalog(), getEvidenceCatalog(), getAgingEvidenceCatalog()));
  check('applications-evidence contract', 'validateApplicationsEvidenceCatalog', () => validateApplicationsEvidenceCatalog(getApplicationsEvidenceCatalog()));
  check('applications catalog contract', 'validateApplicationsCatalog', () => validateApplicationsCatalog(getApplicationsLedger(), getApproachCatalog(), getApplicationsEvidenceCatalog()));
  check('geroscience-evidence contract', 'validateGeroscienceEvidenceCatalog', () => validateGeroscienceEvidenceCatalog(getGeroscienceEvidenceCatalog()));
  check('research-program contract', 'validateProgramNodes', () => validateProgramNodes(getProgramNodes()));
  check('hardware-cost contract', 'validateHardwareCatalog', () => validateHardwareCatalog(getHardwareCatalog()));
  check('tissue-evidence contract', 'validateTissueEvidenceCatalog', () => validateTissueEvidenceCatalog(getTissueEvidenceCatalog()));
  check('scaffold-evidence contract', 'validateScaffoldEvidenceCatalog', () => validateScaffoldEvidenceCatalog(getScaffoldEvidenceCatalog()));
  check('scaffold-methods contract', 'validateScaffoldMethods', () => validateScaffoldMethods(getScaffoldMethods()));
  check('tissue-atlas contract', 'validateTissueTargets', () => validateTissueTargets(getTissueTargets().map(t => ({ ...t, relatedIds: {} }))));
  check('model provenance manifest', 'node scripts/build-model-provenance.mjs --check', () => execFileSync(process.execPath, ['scripts/build-model-provenance.mjs', '--check'], { cwd: directory, stdio: 'pipe' }));
  check('asset hashes', 'verify-release asset hash check', () => {
    for (const asset of JSON.parse(readFileSync(resolve(directory,'assets/manifest.json'),'utf8')).assets) {
      if (!/^assets\/[a-z_]+\.glb$/.test(asset.file)) throw Error('Invalid manifest path');
      const data=readFileSync(resolve(directory,asset.file));if(data.length!==asset.bytes || data.length>asset.maxBytes || createHash('sha256').update(data).digest('hex')!==asset.sha256) throw Error(`Asset mismatch: ${asset.file}`);
    }
  });
  check('whitespace', 'git diff --check', () => execFileSync('git',['diff','--check'],{cwd:directory,stdio:'pipe'}));
  for (const [name, command] of [['unit tests','npm test'],['syntax','npm run check']]) check(name,command,()=>execFileSync('npm',command.split(' ').slice(1),{cwd:directory,stdio:'pipe',timeout:120000}));
  for (const name of ['browser checks','citation claim-support review','external claims scanner review','live Blender isolation checks (evidence: docs/blender-isolation-run-2026-11-02.json, run 2026-11-02 in Blender 5.1.2 via MCP; this script still cannot execute Blender itself)','owner release approval','deployment']) checks.push({name,status:'not-run',command:null,evidencePath:null,notes:'Separate evidence/authorization required; this script neither claims nor performs this check. The in-repo claims-language scan and authoring-isolation static checks above are scripted companions, not substitutes for these external/live reviews.'});
  let inventory=[];  check('claims-language scan', 'scanClaims', () => { const r = scanClaims(directory); if (r.findings.length) throw Error('Claims scan findings: ' + JSON.stringify(r.findings)); });
  check('authoring-isolation static checks', 'checkAuthoringIsolation', () => { const r = checkAuthoringIsolation(directory); if (r.failures.length) throw Error('Authoring isolation failures: ' + JSON.stringify(r.failures)); });
  check('allowlisted inventory','collectReleaseInventory',()=>{inventory=collectReleaseInventory(directory);});
  return { schema:'bioprinting-workbench/release-verification/1',generatedAt:new Date().toISOString(),targetVersion,candidateCommit:null,checks,inventory,knownLimitations:['Local uncommitted candidate, not a manufacturing or biological release.','Prior claims scan has a reviewed HIGH footer-disclosure false positive; not a clean scan.','Pages main/root pushes may publish automatically; pushing and publication remain unauthorized.'] };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);if(args.length && (args[0]!=='--out'||args.length!==2))throw Error('Usage: node scripts/verify-release.mjs [--out path]');
  const report=verifyRelease();if(args[0]==='--out')writeFileSync(resolve(args[1]),JSON.stringify(report,null,2)+'\n');
  for(const c of report.checks)console.log(`${c.status.toUpperCase()}: ${c.name}`);
  console.log(`Inventoried ${report.inventory.length} candidate files. No commit, upload or deployment performed.`);
  if(report.checks.some(c=>c.status==='fail'))process.exitCode=1;
}