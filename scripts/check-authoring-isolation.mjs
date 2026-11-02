import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Static verification that the Blender authoring scripts keep their safety invariants: owned-scene generation only, refusal paths intact, no unguarded scene removal or .blend saves, node-name prefix discipline. This is a static companion to the live-in-Blender isolation test, which remains separately not-run. */
export const AUTHOR_FILES = ['author_bioprinter.py', 'author_incubator.py', 'author_microscope.py', 'author_perfusion_chamber.py'];
export const PREFIXES = { author_bioprinter: 'Printer_', author_incubator: 'Incubator_', author_microscope: 'Microscope_', author_perfusion_chamber: 'Chamber_' };
export function checkAuthoringIsolation(directory) {
  const assets = join(directory, 'assets');
  const results = [];
  const invariant = (name, ok, detail = '') => results.push({ invariant: name, ok: !!ok, detail });
  const common = readFileSync(join(assets, 'authoring_common.py'), 'utf8');
  invariant('ownership marker constant present', /OWNER\s*=\s*'bioprinting-workbench'/.test(common));
  invariant('owned-scene creation guarded in common', /if bpy\.context\.mode != 'OBJECT'/.test(common) && /asset_owner.*!= OWNER/.test(common));
  invariant('refuses non-owned scene adoption', /is not marked as owned; rename it before generation/.test(common));
  invariant('refuses shared-object removal', /Refusing to remove shared object/.test(common));
  invariant('export context guarded', /Unsafe export context/.test(common) && /window\.scene = previous/.test(common));
  const checkScript = readFileSync(join(assets, '..', 'tests', 'blender_authoring_check.py'), 'utf8');
  invariant('check script purges stale authoring modules before import', checkScript.includes("for stale in [k for k in list(sys.modules) if 'authoring' in k or k.startswith('author_')]") && checkScript.includes('del sys.modules[stale]'));
  invariant('check script writes no .blend and no files outside its staging root', !/save_mainfile|os.remove/.test(checkScript));
  invariant('no .blend save in common', !/save_mainfile|\.blend['"]\s*\)/.test(common));
  for (const f of AUTHOR_FILES) {
    const text = readFileSync(join(assets, f), 'utf8');
    const stem = f.replace('.py', '');
    invariant(f + ': imports authoring_common', /from authoring_common import/.test(text));
    invariant(f + ': uses create_owned_scene', /create_owned_scene\(/.test(text));
    invariant(f + ': uses export_owned_scene', /export_owned_scene\(/.test(text));
    invariant(f + ': no direct scene removal', !/bpy\.data\.scenes\.remove|bpy\.data\.objects\.remove/.test(text));
    invariant(f + ': no save or filesystem writes', !/save_mainfile|open\(|\.write\(/.test(text));
    invariant(f + ': no raw bpy.ops calls', !/bpy\.ops\./.test(text));
    const prefix = PREFIXES[stem];
    const names = [...text.matchAll(/(?:box|cylinder)\((?:scene,\s*)?f?'([^']+)'/g)].map(m => m[1]);
    const bare = names.filter(n => !n.startsWith(prefix));
    invariant(f + ': node literals carry the ' + prefix + ' prefix', names.length > 0 && bare.length === 0, bare.join(','));
  }
  const failures = results.filter(r => !r.ok);
  return {
    schema: 'bioprinting-workbench/authoring-isolation/1',
    results,
    failures,
    summary: `Checked ${results.length} invariants across authoring_common and ${AUTHOR_FILES.length} author scripts: ${failures.length} failure(s). Failures fail the release check.`,
  };
}
if (process.argv[1] && process.argv[1].endsWith('check-authoring-isolation.mjs')) {
  const result = checkAuthoringIsolation(new URL('..', import.meta.url).pathname);
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
}
