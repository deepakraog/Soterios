const { makeRisk, recommendationForRisk } = require('../security/riskEngine');
const { suspiciousPathSignals } = require('../security/windowsChecks');

function processSignals(proc) {
  const signals = suspiciousPathSignals(proc.path);
  const cmd = String(proc.cmd || '').toLowerCase();
  if (cmd.includes('-encodedcommand') || cmd.includes('frombase64string'))
    signals.push({ points: 45, message: 'Command line contains encoded script execution.' });
  if ((proc.name || '').toLowerCase() === 'powershell.exe' && cmd.includes('downloadstring'))
    signals.push({ points: 35, message: 'PowerShell download/execute indicators.' });
  return signals;
}

module.exports = {
  id: 'process-viewer', name: 'Process Viewer',
  description: 'List running processes with CPU/memory and suspicious process scoring.',
  category: 'System', icon: 'list',
  run: async () => {
    const { default: psList } = await import('ps-list');
    const processes = await psList();
    return processes.slice(0, 400).map((p) => {
      const item = { pid: p.pid, ppid: p.ppid || null, name: p.name, cmd: p.cmd || null, path: null, cpu: p.cpu !== undefined ? +p.cpu.toFixed(1) : null, memory: p.memory !== undefined ? +p.memory.toFixed(1) : null };
      item.risk = makeRisk(processSignals(item));
      item.recommendedAction = recommendationForRisk(item.risk, 'process');
      return item;
    }).sort((a, b) => b.risk.score - a.risk.score || (b.cpu || 0) - (a.cpu || 0));
  }
};
