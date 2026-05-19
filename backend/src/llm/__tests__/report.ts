import { writeFileSync } from 'node:fs'
import { C, passCount, failCount, skipCount, results } from './helpers'
import type { ScenarioResult } from './helpers'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/(:\s*)("(?:\\.|[^"\\])*")/g, '$1<span class="hl-str">$2</span>')
    .replace(/(:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, '$1<span class="hl-num">$2</span>')
    .replace(/(:\s*)(true|false)/g, '$1<span class="hl-bool">$2</span>')
    .replace(/(:\s*)(null)/g, '$1<span class="hl-null">$2</span>')
    .replace(
      /("(?:\\.|[^"\\])*")\s*:/g,
      '<span class="hl-key">$1</span><span class="hl-colon">:</span>',
    )
}

export function generateReport(globalStartMs: number, reportPath: string): void {
  const totalMs = Math.round(performance.now() - globalStartMs)

  const rows = results
    .map(
      (r) => `
    <div class="scenario ${r.status}${r.status === 'fail' ? ' open' : ''}" id="s${r.number}">
      <div class="scenario-header" tabindex="0" role="button" onclick="toggle(${r.number})" onkeydown="if(event.key==='Enter'||event.key===' ')toggle(${r.number})">
        <span class="status-badge ${r.status}">${r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '⊘'} ${r.status.toUpperCase()}</span>
        <span class="scenario-num">#${String(r.number).padStart(2, '0')}</span>
        <span class="scenario-label">${esc(r.label)}</span>
        <span class="scenario-time">${r.timingMs}ms</span>
        <span class="toggle-icon">▶</span>
      </div>
      <div class="scenario-body${r.status === 'fail' ? ' open' : ''}" id="body${r.number}">
        <div class="meta-grid">
          ${r.expectation ? `<div class="meta-item"><span class="meta-label">Expect</span><span class="meta-value">${esc(r.expectation)}</span></div>` : ''}
          ${r.note ? `<div class="meta-item"><span class="meta-label">Why</span><span class="meta-value">${esc(r.note)}</span></div>` : ''}
          ${r.detail ? `<div class="meta-item"><span class="meta-label">Detail</span><span class="meta-value fail-text">${esc(r.detail)}</span></div>` : ''}
          ${r.errorMessage ? `<div class="meta-item"><span class="meta-label">Error</span><span class="meta-value error-text">${esc(r.errorMessage)}</span></div>` : ''}
          <div class="meta-item"><span class="meta-label">Timing</span><span class="meta-value">${r.timingMs}ms</span></div>
        </div>
        ${
          r.request
            ? `
        <div class="block">
          <div class="block-title" tabindex="0" role="button" onclick="toggleBlock('req${r.number}')" onkeydown="if(event.key==='Enter'||event.key===' ')toggleBlock('req${r.number}')"><span class="toggle-icon">▶</span> Request &nbsp;<span class="dim">${r.request.method} ${esc(r.request.path)}</span></div>
          <pre class="block-body" id="req${r.number}">${syntaxHighlight(esc(JSON.stringify(r.request.body, null, 2)))}</pre>
        </div>`
            : ''
        }
        ${
          r.response
            ? `
        <div class="block">
          <div class="block-title" tabindex="0" role="button" onclick="toggleBlock('res${r.number}')" onkeydown="if(event.key==='Enter'||event.key===' ')toggleBlock('res${r.number}')"><span class="toggle-icon">▶</span> Response &nbsp;<span class="dim">HTTP ${r.response.status}</span></div>
          <pre class="block-body" id="res${r.number}">${syntaxHighlight(esc(JSON.stringify(r.response.body, null, 2)))}</pre>
        </div>`
            : ''
        }
        ${
          r.llmContent
            ? `
        <div class="llm-content">
          <div class="block-title" tabindex="0" role="button" onclick="toggleBlock('llm${r.number}')" onkeydown="if(event.key==='Enter'||event.key===' ')toggleBlock('llm${r.number}')"><span class="toggle-icon">▶</span> LLM Said</div>
          <div class="block-body" id="llm${r.number}">${esc(r.llmContent)}</div>
        </div>`
            : ''
        }
      </div>
    </div>`,
    )
    .join('\n')

  const summaryBar = [
    { label: 'Passed', count: passCount, cls: 'pass' },
    { label: 'Failed', count: failCount, cls: 'fail' },
    { label: 'Skipped', count: skipCount, cls: 'skip' },
  ]
    .map((s) => `<span class="summary-${s.cls}">${s.label}: ${s.count}</span>`)
    .join(' &middot; ')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LLM Test Report</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
.header { max-width: 960px; margin: 0 auto 24px; }
.header h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
.header .sub { color: #8b949e; font-size: 13px; margin-bottom: 16px; }
.config-grid { display: grid; grid-template-columns: auto 1fr; gap: 3px 16px; font-size: 13px; margin-bottom: 16px; }
.config-grid .cl { color: #8b949e; }
.config-grid .cv { color: #e6edf3; font-family: 'SFMono-Regular', Consolas, monospace; }
.summary-bar { display: flex; gap: 24px; font-size: 15px; font-weight: 600; padding: 12px 0; border-top: 1px solid #21262d; margin-bottom: 4px; }
.summary-pass { color: #3fb950; }
.summary-fail { color: #f85149; }
.summary-skip { color: #d29922; }
.controls { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.controls input, .controls select { background: #161b22; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 10px; border-radius: 6px; font-size: 13px; }
.controls input { flex: 1; min-width: 160px; }
.controls select { cursor: pointer; }
.scenario { background: #161b22; border: 1px solid #21262d; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
.scenario.pass { border-left: 3px solid #3fb950; }
.scenario.fail { border-left: 3px solid #f85149; }
.scenario.skip { border-left: 3px solid #d29922; }
.scenario-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; user-select: none; font-size: 14px; }
.scenario-header:hover { background: #1c2128; }
.status-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; min-width: 58px; text-align: center; }
.status-badge.pass { background: rgba(63,185,80,0.15); color: #3fb950; }
.status-badge.fail { background: rgba(248,81,73,0.15); color: #f85149; }
.status-badge.skip { background: rgba(210,153,34,0.15); color: #d29922; }
.scenario-num { color: #8b949e; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; min-width: 28px; }
.scenario-label { flex: 1; }
.scenario-time { color: #8b949e; font-size: 12px; font-family: 'SFMono-Regular', Consolas, monospace; min-width: 50px; text-align: right; }
.toggle-icon { color: #8b949e; font-size: 10px; transition: transform .15s; display: inline-block; }
.scenario.open .toggle-icon { transform: rotate(90deg); }
.scenario-body { display: none; padding: 0 14px 14px; font-size: 13px; }
.scenario-body.open { display: block; }
.scenario-header:focus-visible { outline: 2px solid #58a6ff; outline-offset: -2px; border-radius: 8px; }
.block-title:focus-visible { outline: 2px solid #58a6ff; outline-offset: -2px; border-radius: 4px; }
.meta-grid { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; margin-bottom: 12px; font-size: 13px; }
.meta-label { color: #8b949e; }
.meta-value { color: #e6edf3; word-break: break-word; }
.fail-text { color: #f85149; }
.error-text { color: #f85149; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; }
.block { margin-bottom: 8px; }
.block-title { cursor: pointer; user-select: none; color: #58a6ff; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; margin-bottom: 4px; }
.block-title:hover { color: #79c0ff; }
.block-title .dim { color: #8b949e; }
.block-body { display: none; background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 12px; overflow-x: auto; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
.block-body.open { display: block; }
.block.open .toggle-icon { transform: rotate(90deg); }
.llm-content { margin-top: 4px; }
.llm-content .block-body { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 12px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
.hl-key { color: #ff7b72; }
.hl-str { color: #a5d6ff; }
.hl-num { color: #79c0ff; }
.hl-bool { color: #ffa657; }
.hl-null { color: #8b949e; }
.hl-brace { color: #e6edf3; }
.hl-colon { color: #8b949e; }
footer { text-align: center; color: #484f58; font-size: 12px; margin-top: 32px; }
</style>
</head>
<body>
<div class="header">
  <h1>LLM Test Report</h1>
  <div class="sub">Generated ${new Date().toISOString()} &middot; Total: ${totalMs}ms</div>
  <div class="config-grid">
    <span class="cl">Backend</span><span class="cv">${esc(process.env.BACKEND_URL ?? 'http://127.0.0.1:3001')}</span>
    <span class="cl">LLM URL</span><span class="cv">${esc(process.env.LLM_BASE_URL ?? 'http://127.0.0.1:1234/v1')}</span>
    <span class="cl">Model</span><span class="cv">${esc(process.env.LLM_MODEL ?? 'qwen/qwen3-1.7b')}</span>
    <span class="cl">Scenarios</span><span class="cv">${results.length} total (${passCount} passed, ${failCount} failed, ${skipCount} skipped)</span>
  </div>
  <div class="summary-bar">${summaryBar}</div>
  <div class="controls">
    <input type="text" id="search" placeholder="Search scenarios..." oninput="filterResults()">
    <select id="statusFilter" onchange="filterResults()">
      <option value="all">All</option>
      <option value="pass">Passed</option>
      <option value="fail">Failed</option>
      <option value="skip">Skipped</option>
    </select>
  </div>
</div>
<div id="results">${rows}</div>
<footer>LLM Test Report &mdash; close this tab when done</footer>
<script>
function toggle(n) { document.getElementById('body'+n).classList.toggle('open'); document.getElementById('s'+n).classList.toggle('open'); }
function toggleBlock(id) { const el=document.getElementById(id); el.classList.toggle('open'); el.parentElement.classList.toggle('open'); }
function filterResults() {
  const q = document.getElementById('search').value.toLowerCase();
  const f = document.getElementById('statusFilter').value;
  document.querySelectorAll('.scenario').forEach(el => {
    const label = el.querySelector('.scenario-label').textContent.toLowerCase();
    const status = el.classList.contains('pass') ? 'pass' : el.classList.contains('fail') ? 'fail' : 'skip';
    const matchSearch = !q || label.includes(q);
    const matchFilter = f === 'all' || f === status;
    el.style.display = matchSearch && matchFilter ? '' : 'none';
  });
}
</script>
</body>
</html>`

  writeFileSync(reportPath, html, 'utf-8')
  console.log()
  console.log(`  ${C.green}✓${C.nc} HTML report written to:`)
  console.log(`    ${C.cyan}${reportPath}${C.nc}`)
}
