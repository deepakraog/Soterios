window.Pages = window.Pages || {};
window.Pages.scanner = {
  selectedPath: null, lastResults: null, settings: null,
  async render(container) {
    this.settings = await Api.getSettings();
    this.selectedPath = this.selectedPath || this.settings.scanner.defaultPath || null;
    container.innerHTML = `
      <div class="page-header"><h1 class="page-title">File Scanner</h1>
        <div class="page-subtitle">Local signatures, heuristics, quarantine, and scan history</div></div>
      <div class="panel" style="margin-bottom:18px;">
        <div class="panel-title">Target Folder</div>
        <div class="path-picker">
          <input type="text" id="scanPath" placeholder="No folder selected" readonly value="${escapeHtml(this.selectedPath || '')}" />
          <button class="btn" id="browseBtn">Browse</button>
          <button class="btn btn-primary" id="scanBtn" ${this.selectedPath ? '' : 'disabled'}>Run Scan</button>
        </div>
        <div class="scanner-options">
          <label class="checkbox-row"><input type="checkbox" id="includeClean" ${this.settings.scanner.includeCleanResults ? 'checked' : ''} /> Include clean files</label>
          <label class="inline-field">Depth <input type="number" id="maxDepth" min="1" max="32" value="${escapeHtml(this.settings.scanner.maxDepth)}" /></label>
          <label class="inline-field">Max MB <input type="number" id="maxFileSizeMB" min="1" max="4096" value="${escapeHtml(this.settings.scanner.maxFileSizeMB)}" /></label>
        </div>
        <div id="scanProgress" class="muted-line"></div>
      </div>
      <div class="grid grid-4" id="scanSummaryTiles" style="display:none; margin-bottom:18px;"></div>
      <div class="panel" style="margin-bottom:18px;">
        <div class="panel-title">Results</div>
        <div class="log-surface" id="scanResults"><div class="empty-state">Select a folder and run a scan.</div></div>
      </div>
      <div class="panel"><div class="panel-title">Scan History</div>
        <div id="scanHistory"><div class="empty-state">Loading...</div></div></div>`;
    container.querySelector('#browseBtn').addEventListener('click', () => this.browse(container));
    container.querySelector('#scanBtn').addEventListener('click', () => this.runScan(container));
    if (this.lastResults) this.renderResults(container, this.lastResults);
    this.renderHistory(container);
  },
  async browse(container) {
    const p = await Api.pickFolder();
    if (!p) return;
    this.selectedPath = p;
    container.querySelector('#scanPath').value = p;
    container.querySelector('#scanBtn').disabled = false;
  },
  async runScan(container) {
    const scanBtn = container.querySelector('#scanBtn');
    const progressEl = container.querySelector('#scanProgress');
    const resultsEl = container.querySelector('#scanResults');
    setButtonLoading(scanBtn, true, 'Scanning...');
    resultsEl.innerHTML = '<div class="empty-state">Scanning...</div>';
    const unsub = Api.onToolProgress('file-scanner', (p) => {
      progressEl.textContent = `Scanned ${p.scanned}/${p.total} — ${p.flagged} flagged`;
    });
    try {
      const data = await Api.runTool('file-scanner', { path: this.selectedPath, includeCleanResults: container.querySelector('#includeClean').checked, maxDepth: Number(container.querySelector('#maxDepth').value || 12), maxFileSizeMB: Number(container.querySelector('#maxFileSizeMB').value || 512) });
      this.lastResults = data;
      window.AppState.lastScanSummary = data.summary;
      progressEl.textContent = `Scan complete. ${data.summary.flagged} item(s) flagged.`;
      this.renderResults(container, data);
      this.renderHistory(container);
    } catch (err) { showToolError(resultsEl, err); } finally { unsub(); setButtonLoading(scanBtn, false); }
  },
  renderResults(container, data) {
    const { summary, results } = data;
    const tiles = container.querySelector('#scanSummaryTiles');
    tiles.style.display = 'grid';
    tiles.innerHTML = `
      <div class="stat-tile"><div class="stat-label">Scanned</div><div class="stat-value">${summary.totalScanned}</div></div>
      <div class="stat-tile"><div class="stat-label">Flagged</div><div class="stat-value ${summary.flagged ? 'warn' : 'ok'}">${summary.flagged}</div></div>
      <div class="stat-tile"><div class="stat-label">Matches</div><div class="stat-value danger">${summary.matches}</div></div>
      <div class="stat-tile"><div class="stat-label">Skipped</div><div class="stat-value">${summary.skipped}</div></div>`;
    const resultsEl = container.querySelector('#scanResults');
    if (!results.length) { resultsEl.innerHTML = '<div class="empty-state">No flagged files found.</div>'; return; }
    const priority = { match: 0, suspicious: 1, error: 2, skipped: 3, clean: 4 };
    resultsEl.innerHTML = [...results].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9) || ((b.risk && b.risk.score) || 0) - ((a.risk && a.risk.score) || 0)).slice(0, 500).map((r) => {
      const risk = r.risk || { score: 0, level: 'none' };
      const detail = r.status === 'match' ? `Matched signature "${escapeHtml(r.signatureName)}"` : r.status === 'suspicious' ? escapeHtml((r.flags || []).map((f) => f.message).join('; ')) : escapeHtml(r.error || '');
      const qBtn = (r.status === 'match' || r.status === 'suspicious') ? `<button class="btn btn-sm btn-danger" data-quarantine-path="${escapeHtml(r.path)}" data-hash="${escapeHtml(r.hash || '')}" data-risk="${escapeHtml(JSON.stringify(risk))}">Quarantine</button>` : '';
      return `<div class="log-row result-row"><span class="log-tag ${r.status}">${r.status.toUpperCase()}</span><span class="risk-pill risk-${escapeHtml(risk.level)}">${risk.score}</span><span class="log-path">${escapeHtml(r.path)}${detail ? ` <span class="row-detail"> — ${detail}</span>` : ''}</span>${qBtn}</div>`;
    }).join('');
    resultsEl.querySelectorAll('[data-quarantine-path]').forEach((btn) => btn.addEventListener('click', async (e) => {
      e.stopPropagation(); btn.disabled = true; btn.textContent = 'Quarantining...';
      try { await Api.runTool('quarantine-file', { path: btn.dataset.quarantinePath, hash: btn.dataset.hash || null, risk: btn.dataset.risk ? JSON.parse(btn.dataset.risk) : null, reason: 'Flagged by scanner' }); btn.textContent = 'Quarantined'; } catch (err) { btn.textContent = 'Failed'; }
    }));
  },
  async renderHistory(container) {
    const el = container.querySelector('#scanHistory');
    try {
      const scans = await Api.getHistory('scans', 6);
      if (!scans.length) { el.innerHTML = '<div class="empty-state">No scans recorded yet.</div>'; return; }
      el.innerHTML = scans.map((scan) => { const s = scan.summary || {}; return `<div class="history-item"><div><div class="history-title">${escapeHtml(s.targetPath || 'Scan')}</div><div class="history-meta">${escapeHtml(new Date(s.completedAt || scan.createdAt).toLocaleString())}</div></div><div class="history-counts"><span class="ok">${s.clean || 0} clean</span><span class="warn">${s.suspicious || 0} suspicious</span><span class="danger">${s.matches || 0} matches</span></div></div>`; }).join('');
    } catch (err) { showToolError(el, err); }
  }
};
