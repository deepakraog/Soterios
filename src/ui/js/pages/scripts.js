window.Pages = window.Pages || {};
window.Pages.scripts = {
  render(container) {
    container.innerHTML = `
      <div class="page-header"><h1 class="page-title">Maintenance Scripts</h1>
        <div class="page-subtitle">Safe, local scripts you can run on demand. Nothing runs automatically.</div></div>
      <div id="scriptList" class="grid grid-2"></div>
      <div class="section-spacer"></div>
      <div class="panel"><div class="panel-title">Output</div>
        <div class="log-surface" id="scriptOutput"><div class="empty-state">Run a script to see output here.</div></div></div>`;
    this.load(container);
  },
  async load(container) {
    const listEl = container.querySelector('#scriptList');
    try {
      const scripts = await Api.runTool('list-scripts', {});
      listEl.innerHTML = scripts.map((s) => `
        <div class="tool-card"><div class="tool-card-head"><div class="tool-card-icon">${iconFor('terminal')}</div>
          <div><div class="tool-card-name">${escapeHtml(s.name)}</div></div></div>
          <div class="tool-card-desc">${escapeHtml(s.description)}</div>
          ${s.id === 'clear-temp-files' ? `<div class="checkbox-row"><input type="checkbox" id="dryRunToggle" checked /><label for="dryRunToggle">Dry run (preview only)</label></div>` : ''}
          <button class="btn btn-primary btn-sm" data-script-id="${s.id}" style="align-self:flex-start;">Run</button>
        </div>`).join('');
      listEl.querySelectorAll('[data-script-id]').forEach((btn) => btn.addEventListener('click', () => this.runScript(container, btn)));
    } catch (err) { showToolError(listEl, err); }
  },
  async runScript(container, btn) {
    const scriptId = btn.dataset.scriptId;
    const outputEl = container.querySelector('#scriptOutput');
    setButtonLoading(btn, true, 'Running…');
    outputEl.innerHTML = '<div class="empty-state">Running…</div>';
    const scriptArgs = {};
    if (scriptId === 'clear-temp-files') { const cb = container.querySelector('#dryRunToggle'); scriptArgs.dryRun = cb ? cb.checked : true; }
    try {
      const result = await Api.runTool('run-script', { scriptId, scriptArgs });
      this.renderOutput(outputEl, result);
    } catch (err) { showToolError(outputEl, err); } finally { setButtonLoading(btn, false); }
  },
  renderOutput(outputEl, result) {
    if (result.log && Array.isArray(result.log)) {
      outputEl.innerHTML = `<div class="log-row" style="background:var(--panel-raised);"><span class="log-path">${result.dryRun ? '[DRY RUN] ' : ''}${result.deletedCount ?? 0} item(s), ${result.freedMB ?? 0} MB ${result.dryRun ? 'would be freed' : 'freed'}</span></div>` + (result.log.slice(0, 300).map((line) => `<div class="log-row"><span class="log-path">${escapeHtml(line)}</span></div>`).join('') || '<div class="empty-state">Nothing to clean up.</div>'); return;
    }
    if (Array.isArray(result.files)) { outputEl.innerHTML = `<div class="log-row" style="background:var(--panel-raised);"><span class="log-path">${result.count} file(s) over ${result.minSizeMB} MB</span></div>${result.files.map((f) => `<div class="log-row"><span class="log-tag warn">${f.sizeMB} MB</span><span class="log-path">${escapeHtml(f.path)}</span></div>`).join('')}`; return; }
    if (Array.isArray(result.browsers)) { outputEl.innerHTML = `<div class="log-row" style="background:var(--panel-raised);"><span class="log-path">Total cache: ${result.totalMB} MB</span></div>${result.browsers.map((b) => `<div class="log-row"><span class="log-tag ${b.sizeMB > 500 ? 'warn' : 'clean'}">${b.sizeMB} MB</span><span class="log-path">${escapeHtml(b.name)}</span></div>`).join('')}`; return; }
    if (Array.isArray(result.volumes)) { outputEl.innerHTML = result.volumes.map((v) => `<div class="log-row"><span class="log-tag ${v.usePercent > 90 ? 'match' : 'clean'}">${v.usePercent}%</span><span class="log-path">${escapeHtml(v.mount)} — ${v.usedGB} / ${v.sizeGB} GB</span></div>`).join(''); return; }
    outputEl.innerHTML = `<div class="log-row"><span class="log-path" style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(result, null, 2))}</span></div>`;
  }
};
