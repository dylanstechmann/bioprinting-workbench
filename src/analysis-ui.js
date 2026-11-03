import { createAnalysisClient } from './analysis-client.js';
import { OXYGEN_DEFAULTS, extractOxygenSlice, validateOxygen3DSettings } from './oxygen3d.js';
import { parseOxygen3DMeasurements, oxygen3DExample } from './calibration3d.js';
import { createTeachingNetwork, solveFlowNetwork, validateFlowSettings } from './flow.js';
import { MEASUREMENT_BYTES } from './validation.js';

export function createAnalysisUI({ elements: $, client = createAnalysisClient(), onStateChange = () => {}, onFlow = () => {} }) {
  let settings = { ...OXYGEN_DEFAULTS }, parameterOrigin = 'synthetic-controls', input = null, result = null, fit = null, generation = 0, fileGeneration = 0;
  let flow = { enabled: true, pressureDrive: .6, branchResistances: [1,1,1] }, flowResult = null, fitGeneration = 0;
  const status = value => { $('oxygen3d-status').textContent = value; };
  function invalidateFit() { fitGeneration++; client.invalidate('oxygen-fit'); fit = null; $('fit3d-apply').disabled = true; $('fit3d-result').textContent = input ? 'Dataset loaded; fit needs recomputation.' : 'No 3D dataset. Nothing is calibrated.'; }
  function invalidateField() { generation++; client.invalidate('oxygen-solve'); result = null; $('oxygen3d-canvas').hidden = true; $('oxygen3d-values').textContent = ''; status('Settings changed. Solve the normalized box to refresh.'); }
  function notify() { onStateChange(); }
  function drawSlice() {
    if (!result) return;
    const axis = $('oxygen3d-axis').value, index = Number($('oxygen3d-slice').value), slice = extractOxygenSlice(result, axis, index), canvas = $('oxygen3d-canvas'), ctx = canvas.getContext('2d');
    canvas.hidden = false; canvas.width = canvas.height = 320;
    const size = 320 / slice.width;
    slice.values.forEach((v, i) => { const t = Math.max(0, Math.min(1, v)); ctx.fillStyle = v < 0 ? '#c04473' : `rgb(${Math.round(240-205*t)},${Math.round(235-100*t)},${Math.round(190-62*t)})`; ctx.fillRect(i % slice.width * size, Math.floor(i / slice.width) * size, Math.ceil(size), Math.ceil(size)); });
    canvas.setAttribute('aria-label', `${axis} slice at ${slice.coordinate.toFixed(3)}; concentration range ${result.min.toFixed(4)} to ${result.max.toFixed(4)}. Dimensionless, not tissue oxygen.`);
    $('oxygen3d-coordinate').textContent = `${axis} = ${slice.coordinate.toFixed(3)}`;
    $('oxygen3d-values').textContent = Array.from({length:slice.height},(_,row)=>Array.from(slice.values.slice(row*slice.width,(row+1)*slice.width),v=>v.toFixed(3)).join(' ')).join('\n');
  }
  async function solve() {
    const current = ++generation;
    result = null; $('oxygen3d-canvas').hidden = true; $('oxygen3d-values').textContent = '';
    status('Solving synthetic normalized box in a worker…');
    try {
      const next = await client.request('oxygen-solve', { settings });
      if (current !== generation) return;
      result = next;
      $('oxygen3d-slice').max = settings.resolution - 1;
      $('oxygen3d-slice').value = Math.min(Number($('oxygen3d-slice').value), settings.resolution-1);
      status(`${next.converged ? 'Converged' : 'NOT converged'} · center ${next.center.toFixed(4)} · min/max ${next.min.toFixed(4)}/${next.max.toFixed(4)} · residual ${next.residualInfinity.toExponential(2)} · flux imbalance ${next.balanceError.toExponential(2)} · ${next.iterations} iterations. ${next.inDomain ? 'No modeled negative values.' : 'Outside nonnegative model domain; values are not clipped.'}`);
      drawSlice();
    } catch (error) { if (error.name !== 'AbortError' && current === generation) status(error.message); }
  }
  async function runFit() {
    if (!input) return;
    const current = ++fitGeneration;
    fit = null;
    $('fit3d-apply').disabled = true;
    $('fit3d-result').textContent = 'Fitting scalar demand under fixed box assumptions…';
    try {
      const next = await client.request('oxygen-fit', structuredClone({ settings, input }));
      if (current !== fitGeneration) return;
      fit = next;
      $('fit3d-result').textContent = `${next.dataKind} (unverified declaration) · n=${next.n} · q=${next.q === null ? 'unidentifiable' : next.q.toFixed(5)} · ratio RMSE=${next.residualRMSE.toExponential(3)} · sensitivity²=${next.sensitivityNormSquared.toExponential(3)}. ${next.assumptionNotice}${next.inDomain ? '' : ' Estimate cannot be applied: unidentifiable or outside [0,2].'}`;
      $('fit3d-apply').disabled = !next.identifiable || !next.inDomain || !next.converged;
    } catch (error) { if (error.name !== 'AbortError' && current === fitGeneration) $('fit3d-result').textContent = error.message; }
  }
  function setInput(next) {
    fileGeneration++;
    invalidateFit(); input = next;
    if (next) { settings.boundaryMode = next.domain.boundaryMode; $('oxygen3d-boundary').value = settings.boundaryMode; invalidateField(); runFit(); }
    else $('fit3d-result').textContent = 'No 3D dataset. Nothing is calibrated.';
    parameterOrigin = 'synthetic-controls'; notify();
  }
  function drawFlow() {
    const network = createTeachingNetwork(flow);
    try { flowResult = flow.enabled ? solveFlowNetwork(network) : { status: 'disabled', edgeFlows: [], nodePressures: [], boundaryFlows: [], maxInteriorResidual: 0, globalBalanceError: 0, units: 'dimensionless', message: 'Channels disabled; no network animation.' }; }
    catch (error) { flowResult = { status:'invalid', message:error.message }; }
    $('flow-status').textContent = `${flowResult.status} · drive ${flow.pressureDrive.toFixed(2)} · node residual ${(flowResult.maxInteriorResidual || 0).toExponential(2)} · balance ${(flowResult.globalBalanceError || 0).toExponential(2)}. ${flowResult.message}`;
    const tbody = $('flow-values'); tbody.replaceChildren();
    for (const edge of flowResult.edgeFlows || []) { const tr = document.createElement('tr'); for (const value of [edge.id, edge.flow.toFixed(6)]) { const td=document.createElement('td');td.textContent=value;tr.append(td); } tbody.append(tr); }
    const svg = $('flow-network'); svg.replaceChildren();
    const ns='http://www.w3.org/2000/svg';
    for (let i=0;i<3;i++) { const path=document.createElementNS(ns,'path'); path.setAttribute('d',`M35 75H75L110 ${35+i*40}H270L305 75H345`);path.setAttribute('fill','none');path.setAttribute('stroke','#267b72');path.setAttribute('stroke-width','3');svg.append(path); const label=document.createElementNS(ns,'text');label.setAttribute('x','130');label.setAttribute('y',String(27+i*40));label.textContent=`R${i+1} = ${flow.branchResistances[i].toPrecision(3)}`;svg.append(label); }
    onFlow(flowResult);
  }
  for (const id of ['oxygen3d-demand','oxygen3d-resolution','oxygen3d-boundary']) $(id).addEventListener('change', () => {
    try { settings = validateOxygen3DSettings({ ...settings, demand: Number($('oxygen3d-demand').value), resolution: Number($('oxygen3d-resolution').value), boundaryMode: $('oxygen3d-boundary').value }); }
    catch (error) { $('oxygen3d-demand').value=settings.demand; status(error.message); return; }
    parameterOrigin = 'synthetic-controls'; invalidateField(); invalidateFit();
    if (input && input.domain.boundaryMode !== settings.boundaryMode) { input = null; $('fit3d-result').textContent='Dataset cleared: boundary mode changed.'; }
    notify();
  });
  $('oxygen3d-solve').addEventListener('click', solve);
  for (const id of ['oxygen3d-axis','oxygen3d-slice']) $(id).addEventListener('input',drawSlice);
  $('fit3d-file').addEventListener('change', async event => {
    const file=event.target.files[0]; if(!file)return;
    const current = ++fileGeneration;
    invalidateFit();
    try { if(file.size>MEASUREMENT_BYTES)throw new RangeError('Measurement file exceeds 256 KiB'); const parsed = parseOxygen3DMeasurements(await file.text()); if (current === fileGeneration) setInput(parsed); }
    catch(error) { if (current === fileGeneration) $('fit3d-result').textContent=error.message; } finally { event.target.value=''; }
  });
  $('fit3d-example').addEventListener('click',()=>setInput(parseOxygen3DMeasurements(oxygen3DExample())));
  $('fit3d-clear').addEventListener('click',()=>setInput(null));
  $('fit3d-run').addEventListener('click',runFit);
  $('fit3d-apply').addEventListener('click',()=>{ if(!fit?.inDomain || !fit.identifiable || !fit.converged)return; settings.demand=fit.q; parameterOrigin='explicit-fit-application';$('oxygen3d-demand').value=fit.q;invalidateField();notify();solve(); });
  for(let i=0;i<3;i++) $(`flow-r${i}`).addEventListener('change',()=>{
    try { const next=validateFlowSettings({...flow,branchResistances:[0,1,2].map(j=>Number($(`flow-r${j}`).value))});flow=next;drawFlow();notify(); }
    catch(error){$(`flow-r${i}`).value=flow.branchResistances[i];$('flow-status').textContent=error.message;}
  });
  return {
    setState(state) {
      fileGeneration++;
      client.invalidate(); generation++; result=null;fit=null;
      $('oxygen3d-canvas').hidden = true; $('oxygen3d-values').textContent = '';
      settings={...state.oxygen3d.settings};parameterOrigin=state.oxygen3d.parameterOrigin;input=state.dataset;
      flow=validateFlowSettings(state.flow);
      $('oxygen3d-demand').value=settings.demand;$('oxygen3d-resolution').value=settings.resolution;$('oxygen3d-boundary').value=settings.boundaryMode;
      $('oxygen3d-slice').max=settings.resolution-1;$('oxygen3d-slice').value=Math.floor(settings.resolution/2);
      for(let i=0;i<3;i++)$(`flow-r${i}`).value=flow.branchResistances[i];
      invalidateFit();drawFlow();solve();if(input)runFit();
    },
    getFieldSnapshot() {
      if (!result) return { snapshot: null, reason: 'No solved box field yet. Solve the normalized box first.' };
      return {
        reason: null,
        snapshot: {
          modelId: 'box-oxygen',
          settings: { ...settings },
          parameterOrigin,
          generation,
          values: Float64Array.from(result.values),
          diagnostics: { converged: result.converged, inDomain: result.inDomain, min: result.min, max: result.max },
        },
      };
    },
    setFlowControls(enabled,pressureDrive){if(flow.enabled!==enabled||flow.pressureDrive!==pressureDrive){flow={...flow,enabled,pressureDrive};drawFlow();}},
    getState:()=>({oxygen3d:{settings:{...settings},parameterOrigin},flow:{...flow,branchResistances:[...flow.branchResistances]},dataset:input}),
    diagnostics:()=>({oxygen3d:result?{converged:result.converged,center:result.center,residual:result.residualInfinity,balanceError:result.balanceError}:null,fit:fit?{q:fit.q,identifiable:fit.identifiable,inDomain:fit.inDomain,dataKind:fit.dataKind}:null,flow:flowResult}),
    dispose(){client.dispose();},
  };
}