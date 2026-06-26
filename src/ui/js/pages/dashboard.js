window.Pages = window.Pages || {};
window.Pages.dashboard = {
  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="flex-between">
          <div><h1 class="page-title">Security Dashboard</h1>
            <div class="page-subtitle">Windows protection status, system health, and prioritized recommendations</div></div>
          <button class="btn" id="refreshDashboard">Refresh</button>
        </div>
      </div>
      <div id="dashboardBody"><div class="empty-state">Checking security posture...</div></div>`;
    container.querySelector('#refreshDashboard').addEventListener('click', () => this.load(container));
    this.load(container);
  },
  async load(container) {
    const body = container.querySelector('#dashboardBody');
    body.innerHTML = '<div class="empty-state">Checking security posture...</div>';
    try {
      const data = await Api.runTool('security-overview', {});
      const rail = document.getElementById('statusRail');
      if (rail) rail.dataset.level = data.level || 'ok';
      const scoreColor = data.score >= 80 ? 'var(--ok)' : data.score >= 60 ? 'var(--warn)' : 'var(--danger)';
      body.innerHTML = `
        <div class="grid grid-2" style="margin-bottom:18px;">
          <div class="panel">
            <div class="panel-title">Overall Security Score</div>
            <div class="score-hero">
              <div class="score-number" style="color:${scoreColor}">${data.score}</div>
              <div>
                <div class="score-label">${escapeHtml(data.level.toUpperCase())}</div>
                <div class="muted-line">Based on Defender, firewall, updates, scan history, quarantine, disk, and load.</div>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="flex-between" style="margin-bottom:14px;">
              <div class="panel-title" style="margin-bottom:0;">Top Recommendations</div>
              <button class="btn btn-sm" data-open-page="actions">View All</button>
            </div>
            <div class="action-list">
              ${data.recommendations.slice(0, 4).map((item) => `
                <div class="mini-action mini-${escapeHtml(item.level)}">
                  <span>${escapeHtml(item.title)}</span>
                  <button class="btn btn-sm" data-open-page="${escapeHtml(item.actionPage)}">Open</button>
                </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="grid grid-4" style="margin-bottom:18px;">
          <div class="stat-tile"><div class="stat-label">Defender</div><div class="stat-value ${defenderLevel(data.defender)}">${defenderLabel(data.defender)}</div></div>
          <div class="stat-tile"><div class="stat-label">Firewall</div><div class="stat-value ${data.firewall && data.firewall.some((p) => !p.enabled) ? 'danger' : 'ok'}">${data.firewall && data.firewall.some((p) => !p.enabled) ? 'Disabled' : 'Enabled'}</div></div>
          <div class="stat-tile"><div class="stat-label">Updates</div><div class="stat-value ${updatesLevel(data.updates)}">${updatesLabel(data.updates)}</div></div>
          <div class="stat-tile"><div class="stat-label">Disk Health</div><div class="stat-value ${data.disk && data.disk.usePercent >= 90 ? 'danger' : data.disk && data.disk.usePercent >= 80 ? 'warn' : 'ok'}">${data.disk ? `${data.disk.usePercent}%` : 'N/A'}</div></div>
        </div>
        <div class="panel">
          <div class="panel-title">Issues</div>
          ${data.issues.length ? data.issues.map((issue) => `
            <div class="action-item action-${escapeHtml(issue.level)}">
              <div class="action-level">${escapeHtml(issue.level)}</div>
              <div><div class="action-title">${escapeHtml(issue.title)}</div><div class="action-detail">${escapeHtml(issue.detail)}</div></div>
              <button class="btn btn-sm" data-open-page="${escapeHtml(issue.actionPage)}">Review</button>
            </div>`).join('') : '<div class="empty-state">No urgent issues detected.</div>'}
        </div>`;
      body.querySelectorAll('[data-open-page]').forEach((btn) => btn.addEventListener('click', () => window.AppRouter.navigate(btn.dataset.openPage)));
    } catch (err) { showToolError(body, err); }
  }
};

function defenderLevel(d) {
  if (!d || !d.available) return '';
  if (!d.antivirusEnabled || !d.realTimeProtectionEnabled) return 'danger';
  if (Number(d.signaturesAge) > 7) return 'warn';
  return 'ok';
}
function defenderLabel(d) {
  if (!d || !d.available) return 'Not queried';
  if (!d.antivirusEnabled) return 'AV disabled';
  if (!d.realTimeProtectionEnabled) return 'RT off';
  if (Number(d.signaturesAge) > 7) return 'Sigs stale';
  return 'Protected';
}
function updatesLevel(u) {
  if (!u || u.pendingCount === null || u.pendingCount === undefined) return '';
  return u.pendingCount > 0 ? 'warn' : 'ok';
}
function updatesLabel(u) {
  if (!u || u.pendingCount === null || u.pendingCount === undefined) return 'Not queried';
  return u.pendingCount > 0 ? `${u.pendingCount} pending` : 'Current';
}
