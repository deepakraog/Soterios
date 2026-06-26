window.Pages = window.Pages || {};
window.Pages.quarantine = {
  async render(container) {
    container.innerHTML = `
      <div class="page-header"><h1 class="page-title">Quarantine</h1>
        <div class="page-subtitle">Review isolated files, restore trusted items, or permanently delete</div></div>
      <div class="panel"><div class="flex-between" style="margin-bottom:14px;">
          <div class="panel-title" style="margin-bottom:0;">Quarantined Items</div>
          <button class="btn btn-sm" id="refreshQ">Refresh</button></div>
        <div id="quarantineList"><div class="empty-state">Loading...</div></div></div>`;
    container.querySelector('#refreshQ').addEventListener('click', () => this.load(container));
    this.load(container);
  },
  async load(container) {
    const listEl = container.querySelector('#quarantineList');
    try {
      const items = await Api.getQuarantine();
      if (!items.length) { listEl.innerHTML = '<div class="empty-state">No files have been quarantined.</div>'; return; }
      listEl.innerHTML = items.map((item) => {
        const active = item.status === 'quarantined';
        return `<div class="history-item quarantine-item"><div class="quarantine-main"><div class="history-title">${escapeHtml(item.fileName || item.originalPath)}</div><div class="history-meta">${escapeHtml(item.reason || 'No reason recorded')}</div><div class="history-meta mono">${escapeHtml(item.originalPath || '')}</div><div class="history-meta">Status: <span class="${active ? 'warn' : ''}">${escapeHtml(item.status)}</span> — ${escapeHtml(new Date(item.createdAt).toLocaleString())}</div></div><div class="quarantine-actions"><button class="btn btn-sm" data-restore-id="${escapeHtml(item.id)}" data-original-path="${escapeHtml(item.originalPath)}" data-quarantine-path="${escapeHtml(item.quarantinePath)}" ${active ? '' : 'disabled'}>Restore</button><button class="btn btn-sm btn-danger" data-delete-id="${escapeHtml(item.id)}" data-quarantine-path="${escapeHtml(item.quarantinePath)}" ${active ? '' : 'disabled'}>Delete</button></div></div>`;
      }).join('');
      listEl.querySelectorAll('[data-restore-id]').forEach((btn) => btn.addEventListener('click', async () => {
        setButtonLoading(btn, true, 'Restoring...');
        try { await Api.runTool('restore-quarantine-file', { id: btn.dataset.restoreId, originalPath: btn.dataset.originalPath, quarantinePath: btn.dataset.quarantinePath }); this.load(container); } catch (err) { btn.textContent = 'Failed'; }
      }));
      listEl.querySelectorAll('[data-delete-id]').forEach((btn) => btn.addEventListener('click', async () => {
        setButtonLoading(btn, true, 'Deleting...');
        try { await Api.runTool('delete-quarantine-file', { id: btn.dataset.deleteId, quarantinePath: btn.dataset.quarantinePath }); this.load(container); } catch (err) { btn.textContent = 'Failed'; }
      }));
    } catch (err) { showToolError(listEl, err); }
  }
};
