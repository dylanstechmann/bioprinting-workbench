import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createBrowserVerificationSuite, summarizeBrowserChecks } from '../scripts/browser-verification-suite.js';

const pass = { id: 'draft-save', status: 'pass' };
const blocked = { id: 'presentation', status: 'blocked', detail: 'WebGL unavailable' };

test('browser aggregation fails on errors or failed checks before blocked status', () => {
  assert.deepEqual(summarizeBrowserChecks([pass], []), { status: 'pass', diagnostics: [] });
  assert.equal(summarizeBrowserChecks([pass], ['page exploded']).status, 'fail');
  const failed = summarizeBrowserChecks([pass, blocked, { id: 'download', status: 'fail' }], []);
  assert.equal(failed.status, 'fail');
  assert.ok(failed.diagnostics.some(message => message.includes('download')));
});

test('browser aggregation blocks only for an actually blocked recorded check', () => {
  const result = summarizeBrowserChecks([pass, blocked], []);
  assert.equal(result.status, 'blocked');
  assert.ok(result.diagnostics.some(message => message.includes('presentation')));
  assert.equal(summarizeBrowserChecks([pass], []).status, 'pass', 'drafts does not infer blocked from unavailable graphics');
});

test('zero completed checks fails closed with an explicit diagnostic', () => {
  const result = summarizeBrowserChecks([], []);
  assert.equal(result.status, 'fail');
  assert.ok(result.diagnostics.some(message => /no browser checks completed/i.test(message)));
});

test('aggregation arguments are validated eagerly and module import starts no browser', () => {
  assert.throws(() => summarizeBrowserChecks(), TypeError);
  assert.throws(() => summarizeBrowserChecks(null, []), TypeError);
  assert.throws(() => summarizeBrowserChecks([], null), TypeError);
  assert.throws(() => summarizeBrowserChecks([{}], []), TypeError);
  assert.throws(() => summarizeBrowserChecks([{ id: 'x', status: 'unknown' }], []), RangeError);
  assert.throws(() => summarizeBrowserChecks([pass], [null]), TypeError);
  assert.throws(() => createBrowserVerificationSuite({ baseURL: 'file:///tmp/index.html' }), TypeError);
  assert.throws(() => createBrowserVerificationSuite({ baseURL: 'http://127.0.0.1:8096', part: 'other' }), RangeError);
  assert.throws(() => createBrowserVerificationSuite({ baseURL: 'http://127.0.0.1:8096', viewport: { width: 0, height: 720 } }), RangeError);
  assert.equal(typeof createBrowserVerificationSuite({ baseURL: 'http://127.0.0.1:8096', part: 'drafts' }), 'function');
});

function presentationPage(options = {}) {
  const state = { scale: 'laboratory', representation: 'illustration', cutPlane: null, motion: 'system' };
  const scenario = { schema: 'bioprinting-workbench/scenario/13', stage: 0 };
  const viewport = { width: 390, height: 844 };
  const values = {
    'presentation-scale': 'laboratory', 'presentation-representation': 'illustration',
    'presentation-cut-axis': 'off', 'presentation-cut-fraction': '0.5', 'presentation-motion': 'system',
  };
  const choices = {
    'presentation-scale': ['laboratory', 'construct', 'cell', 'tissue-context'],
    'presentation-representation': ['illustration', 'model-field'],
    'presentation-cut-axis': ['off', 'x', 'y', 'z'],
    'presentation-motion': ['system', 'reduced'],
  };
  const elements = {
    'webgl-error': { hidden: !(options.webglErrorVisible ?? options.webgl === false), textContent: 'WebGL is unavailable.' },
    'presentation-notice': { textContent: 'The reviewed laboratory scene.' },
    'presentation-selection': { textContent: '' },
  };
  const actions = [];
  let focused = null;
  const transitionFor = id => ({
    'presentation-scale': 'scale', 'presentation-representation': 'representation',
    'presentation-cut-axis': 'cutPlane', 'presentation-cut-fraction': 'cutPlane', 'presentation-motion': 'motion',
  })[id];
  const apply = (id, value, activation) => {
    values[id] = String(value);
    actions.push({ id, value: String(value), activation });
    elements['presentation-notice'].textContent = `${id} changed to ${value}`;
    const transition = transitionFor(id);
    if (options.staleTransition === transition) return;
    if (id === 'presentation-scale') state.scale = String(value);
    if (id === 'presentation-representation') state.representation = String(value);
    if (id === 'presentation-cut-axis') state.cutPlane = value === 'off' ? null : { axis: String(value), fraction: Number(values['presentation-cut-fraction']) };
    if (id === 'presentation-cut-fraction' && state.cutPlane) state.cutPlane = { ...state.cutPlane, fraction: Number(value) };
    if (id === 'presentation-motion') state.motion = String(value);
    if (options.mutateScenarioOn === transition) scenario.stage = 1;
  };
  const graphics = () => {
    if (options.absentDiagnostics) return { webgl: true };
    const presentationState = { ...state, cutPlane: state.cutPlane ? { ...state.cutPlane } : null };
    return {
      webgl: options.webgl === false ? false : true,
      presentationScale: options.contradictoryInitial ? 'cell' : state.scale,
      presentationState,
    };
  };
  const window = {
    innerWidth: viewport.width,
    bioprintingWorkbench: {
      exportScenario: () => JSON.parse(JSON.stringify(scenario)),
      diagnostics: () => ({ graphics: graphics() }),
    },
  };
  const document = {
    documentElement: { get scrollWidth() { return options.scrollWidth ?? viewport.width; } },
    getElementById: id => elements[id] ?? null,
  };
  const evaluate = async (fn, argument) => {
    const context = { window, document, innerWidth: window.innerWidth };
    const callable = vm.runInNewContext(`(${fn.toString()})`, context);
    const result = await callable(argument);
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  };
  const locator = selector => {
    const id = selector.slice(1);
    return {
      async click() { actions.push({ id, activation: 'pointer-open' }); },
      async selectOption(value) { await apply(id, value, 'pointer'); },
      async fill(value) { await apply(id, value, 'fill'); },
      async dispatchEvent() {},
      async focus() { focused = id; },
      async innerText() { return elements[id]?.textContent ?? ''; },
    };
  };
  return {
    actions,
    async setViewportSize(next) { Object.assign(viewport, next); window.innerWidth = next.width; },
    async goto() {},
    on() {}, off() {},
    evaluate,
    locator,
    getByRole(role, { name }) {
      return { async click() { actions.push({ id: `tab-${name}`, activation: 'pointer' }); } };
    },
    async waitForFunction(fn, argument) {
      if (!await evaluate(fn, argument)) throw new Error('Timeout waiting for presentation diagnostics');
    },
    keyboard: {
      async press(key) {
        const valuesForControl = choices[focused];
        if (!valuesForControl) throw new Error(`No select focused for ${key}`);
        const current = valuesForControl.indexOf(values[focused]);
        const next = key === 'ArrowDown' ? Math.min(current + 1, valuesForControl.length - 1)
          : key === 'ArrowUp' ? Math.max(current - 1, 0)
            : key === 'Home' ? 0 : key === 'End' ? valuesForControl.length - 1 : current;
        if (next !== current) await apply(focused, valuesForControl[next], 'keyboard');
      },
    },
  };
}

async function runPresentation(page) {
  return createBrowserVerificationSuite({ baseURL: 'http://127.0.0.1:8096/', part: 'presentation', viewport: { width: 390, height: 844 } })(page);
}

test('presentation requires real diagnostics, pointer/keyboard transitions, byte invariance and no overflow', async () => {
  const page = presentationPage();
  const result = await runPresentation(page);
  assert.equal(result.status, 'pass', result.diagnostics?.join('\n'));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.checks.map(check => check.id), [
    'presentation-graphics-diagnostics', 'presentation-scale-construct',
    'presentation-representation-model-field', 'presentation-cut-plane-x',
    'presentation-motion-reduced', 'presentation-cut-plane-off', 'presentation-motion-system',
    'presentation-scenario-byte-invariance', 'presentation-no-horizontal-overflow',
  ]);
  assert.equal(result.checks.some(check => check.id === 'presentation-rollback'), false);
  const byId = Object.fromEntries(result.checks.map(check => [check.id, check]));
  assert.equal(byId['presentation-scale-construct'].diagnostics.presentationScale, 'construct');
  assert.equal(byId['presentation-scale-construct'].diagnostics.presentationState.scale, 'construct');
  assert.equal(byId['presentation-representation-model-field'].diagnostics.presentationState.representation, 'model-field');
  assert.deepEqual(byId['presentation-cut-plane-x'].diagnostics.presentationState.cutPlane, { axis: 'x', fraction: 0.5 });
  assert.equal(byId['presentation-motion-reduced'].diagnostics.presentationState.motion, 'reduced');
  assert.equal(byId['presentation-cut-plane-off'].diagnostics.presentationState.cutPlane, null);
  assert.equal(byId['presentation-cut-plane-off'].diagnostics.presentationState.motion, 'reduced');
  assert.equal(byId['presentation-motion-system'].diagnostics.presentationState.motion, 'system');
  assert.ok(byId['presentation-scenario-byte-invariance'].beforeBytes > 0);
  assert.equal(byId['presentation-scenario-byte-invariance'].beforeBytes, byId['presentation-scenario-byte-invariance'].afterBytes);
  assert.equal(byId['presentation-no-horizontal-overflow'].scrollWidth, 390);
  assert.equal(byId['presentation-no-horizontal-overflow'].innerWidth, 390);
  assert.ok(page.actions.some(action => action.id === 'presentation-scale' && action.activation === 'pointer'));
  assert.ok(page.actions.some(action => action.id === 'presentation-representation' && action.activation === 'keyboard'));
  assert.ok(page.actions.some(action => action.id === 'presentation-cut-axis' && action.activation === 'pointer'));
  assert.ok(page.actions.some(action => action.id === 'presentation-motion' && action.activation === 'keyboard'));
});

test('presentation fails when graphics presentation diagnostics are absent', async () => {
  const result = await runPresentation(presentationPage({ absentDiagnostics: true }));
  assert.equal(result.status, 'fail');
  assert.match(result.errors.join('\n'), /presentationScale|presentationState|diagnostics/i);
  assert.equal(result.checks.some(check => check.id === 'presentation-scale-construct'), false);
});

for (const [transition, checkId] of [
  ['scale', 'presentation-scale-construct'],
  ['representation', 'presentation-representation-model-field'],
  ['cutPlane', 'presentation-cut-plane-x'],
  ['motion', 'presentation-motion-reduced'],
]) {
  test(`presentation fails on stale ${transition} diagnostics`, async () => {
    const result = await runPresentation(presentationPage({ staleTransition: transition }));
    assert.equal(result.status, 'fail');
    assert.equal(result.checks.some(check => check.id === checkId), false);
    assert.match(result.errors.join('\n'), /diagnostics|timeout/i);
  });
}

test('presentation fails on contradictory scale and state diagnostics', async () => {
  const result = await runPresentation(presentationPage({ contradictoryInitial: true }));
  assert.equal(result.status, 'fail');
  assert.match(result.errors.join('\n'), /diagnostics|expected/i);
});

test('presentation fails when controls mutate canonical scenario bytes', async () => {
  const result = await runPresentation(presentationPage({ mutateScenarioOn: 'motion' }));
  assert.equal(result.status, 'fail');
  assert.match(result.errors.join('\n'), /scenario bytes/i);
});

test('presentation fails on horizontal overflow', async () => {
  const result = await runPresentation(presentationPage({ scrollWidth: 391 }));
  assert.equal(result.status, 'fail');
  assert.match(result.errors.join('\n'), /horizontal overflow/i);
});

test('WebGL-disabled presentation is blocked from diagnostics even without a fallback banner', async () => {
  const page = presentationPage({ webgl: false, webglErrorVisible: false });
  const result = await runPresentation(page);
  assert.equal(result.status, 'blocked');
  assert.equal(result.checks.length, 1);
  assert.equal(result.checks[0].id, 'presentation');
  assert.equal(result.checks[0].status, 'blocked');
  assert.equal(result.checks[0].diagnostics.webgl, false);
  assert.equal(result.checks.some(check => check.status === 'pass'), false);
  assert.equal(page.actions.some(action => action.id.startsWith('presentation-')), false);
  assert.deepEqual(result.errors, []);
});
