window.Pages = window.Pages || {};
window.Pages['quarantine'] = {
  async render(container) {
    container.innerHTML = `
      <header class="page-header">
        <h1 class="page-title">Quarantine</h1>
        <p class="page-subtitle">Isolated files that were detected as threats.</p>
      </header>
      <div class="card">
        <div id="quarantineList" style="display:flex; flex-direction:column; gap:16px;">
          Loading...
        </div>
      </div>
    `;

    try {
      const qList = await window.api.invoke('db:getQuarantineList');
      const listContainer = document.getElementById('quarantineList');
      if (!qList || qList.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No items in quarantine.</div>';
        return;
      }

      listContainer.innerHTML = '';
      qList.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--glass-border);";
        itemEl.innerHTML = `
          <div>
            <div style="font-weight: 500;">${item.threat_name}</div>
            <div class="page-subtitle" style="font-size: 0.8rem; margin-top: 4px;">${item.original_path}</div>
            <div class="page-subtitle" style="font-size: 0.75rem;">${item.date_quarantined} | ${item.engine}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn" data-restore="${item.id}">Restore</button>
            <button class="btn" style="color: var(--accent-danger);" data-delete="${item.id}">Delete</button>
          </div>
        `;
        listContainer.appendChild(itemEl);
      });

      // Attach event listeners to restore buttons
      listContainer.querySelectorAll('[data-restore]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const id = Number(btn.dataset.restore);
            const res = await window.api.invoke('quarantine:restore', id);
            if (res.success) this.render(container);
            else alert('Failed to restore: ' + res.error);
          } catch (e) { alert(e.message || String(e)); }
        });
      });

      // Attach event listeners to delete buttons
      listContainer.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const id = Number(btn.dataset.delete);
            const res = await window.api.invoke('quarantine:delete', id);
            if (res.success) this.render(container);
            else alert('Failed to delete: ' + res.error);
          } catch (e) { alert(e.message || String(e)); }
        });
      });
    } catch (e) {
      document.getElementById('quarantineList').innerHTML = `<div class="empty-state">Failed to load quarantine: ${e.message}</div>`;
    }
  }
};
