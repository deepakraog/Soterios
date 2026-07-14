const fs = require('fs');
const path = require('path');
const os = require('os');

function scanReportsDir() {
  const dir = path.join(os.homedir(), '.soterios', 'scan-reports');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isPathInScanReportsDir(filePath) {
  const resolved = path.resolve(filePath || '');
  return resolved.startsWith(path.resolve(scanReportsDir()));
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isThreatQuarantined(threat, report) {
  if (typeof threat.quarantined === 'boolean') return threat.quarantined;
  const errors = Array.isArray(report.errors) ? report.errors : [];
  const threatPath = threat.path || '';
  if (errors.some((entry) => String(entry).includes(threatPath) && /quarantine/i.test(String(entry)))) {
    return false;
  }
  return report.status === 'completed';
}

function threatsToCsv(report) {
  const threats = Array.isArray(report?.threats) ? report.threats : [];
  const lines = ['name,path,quarantined'];
  for (const threat of threats) {
    const quarantined = isThreatQuarantined(threat, report);
    lines.push([
      csvEscape(threat.name || ''),
      csvEscape(threat.path || ''),
      csvEscape(quarantined)
    ].join(','));
  }
  return `${lines.join('\n')}\n`;
}

function pdfPathForHtml(htmlPath) {
  return String(htmlPath).replace(/\.html$/i, '.pdf');
}

function csvPathForJson(jsonPath) {
  return String(jsonPath).replace(/\.json$/i, '.csv');
}

async function generatePdfFromHtml(htmlPath) {
  const { BrowserWindow } = require('electron');
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true }
  });

  try {
    await win.loadFile(htmlPath);
    const pdfBuffer = await win.webContents.printToPDF({ printBackground: true });
    const pdfPath = pdfPathForHtml(htmlPath);
    fs.writeFileSync(pdfPath, pdfBuffer);
    return pdfPath;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

module.exports = {
  scanReportsDir,
  isPathInScanReportsDir,
  csvEscape,
  isThreatQuarantined,
  threatsToCsv,
  pdfPathForHtml,
  csvPathForJson,
  generatePdfFromHtml
};
