/** Local-only Chromium regression for the archived synthetic research download.
 * Requires an existing Playwright installation; set PW_CORE to its playwright-core path and
 * CHROME to an existing Chromium executable when they are not resolvable by default.
 * Presentation and exchange reports stay separate: blocked WebGL presentation is expected in
 * the disabled case, while the non-graphical exchange must still pass. No biological claim.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './serve.mjs';
import { createBrowserVerificationSuite } from './browser-verification-suite.js';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const fixedUiClock = '2026-11-27T00:00:00.000Z';
let chromium;
try {
  ({ chromium } = require(process.env.PW_CORE || 'playwright-core'));
} catch (error) {
  throw new Error('Playwright is unavailable. Set PW_CORE to an existing playwright-core module; no package is installed by this check.', { cause: error });
}

async function runCase(baseURL, webgl) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || chromium.executablePath(),
    args: webgl
      ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      : ['--disable-webgl'],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }, acceptDownloads: true, serviceWorkers: 'block',
    });
    const externalRequests = [];
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.protocol === 'blob:') return route.continue();
      if (url.origin !== baseURL || request.method() !== 'GET') {
        externalRequests.push({ method: request.method(), url: url.href });
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const presentation = await createBrowserVerificationSuite({ baseURL, part: 'presentation' })(page);
    assert.equal(presentation.status, webgl ? 'pass' : 'blocked', JSON.stringify(presentation.diagnostics));
    const graphics = await page.evaluate(() => ({
      webgl: window.bioprintingWorkbench.diagnostics().graphics.webgl,
      fallback: !document.getElementById('webgl-error').hidden,
    }));
    assert.deepEqual(graphics, { webgl, fallback: !webgl });

    const exchange = await createBrowserVerificationSuite({ baseURL, part: 'exchange' })(page);
    assert.equal(exchange.status, 'pass', JSON.stringify(exchange.diagnostics));
    assert.deepEqual(externalRequests, [], 'The exchange must remain on the local static origin');
    return {
      webgl,
      graphicsMethod: webgl ? 'ANGLE/SwiftShader' : '--disable-webgl',
      browser: browser.version(),
      graphics,
      presentation,
      exchange,
      externalRequests,
    };
  } finally {
    await browser.close();
  }
}

const server = createStaticServer({ root });
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const results = [];
try {
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  for (const webgl of [true, false]) {
    try {
      results.push(await runCase(baseURL, webgl));
    } catch (error) {
      results.push({ webgl, status: 'fail', error: error.stack });
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
const pass = results.length === 2 && results.every(result =>
  result.exchange?.status === 'pass'
  && result.presentation?.status === (result.webgl ? 'pass' : 'blocked')
  && result.graphics?.webgl === result.webgl
  && result.graphics?.fallback === !result.webgl
  && result.externalRequests?.length === 0);
const receipt = {
  schema: 'bioprinting-workbench/browser-exchange-regression/1',
  observed: 'Agent-run local software checks only; synthetic exchange, not biological validation or owner review.',
  fixedUiClock,
  status: pass ? 'pass' : 'fail',
  results,
};
console.log(JSON.stringify(receipt, null, 2));
if (!pass) process.exitCode = 1;
