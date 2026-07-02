const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// PIDs that should never be terminated regardless of what they resolve to.
const PROTECTED_PIDS = new Set([0, 4]);

// Process names that are critical to Windows staying up, or to the OS being
// able to log the user back in. Killing these can bluescreen or lock out the
// session, so they're blocked outright rather than just warned about.
const PROTECTED_NAMES = new Set([
  'system',
  'system idle process',
  'registry',
  'smss.exe',
  'csrss.exe',
  'wininit.exe',
  'winlogon.exe',
  'services.exe',
  'lsass.exe',
  'lsm.exe',
  'svchost.exe',
  'explorer.exe',
  'dwm.exe',
  'fontdrvhost.exe'
]);

// ps-list is ESM-only so we must use dynamic import()
class ProcessInspector {
  constructor() {}

  async getProcesses() {
    try {
      const { default: psList } = await import('ps-list');
      const processes = await psList();
      return processes.map(p => ({
        pid: p.pid,
        name: p.name,
        cmd: p.cmd || '',
        ppid: p.ppid,
        cpu: p.cpu,
        memory: p.memory,
        suspicious: !!(
          p.name && p.name.toLowerCase() === 'powershell.exe' &&
          p.cmd && p.cmd.includes('-enc')
        )
      }));
    } catch (err) {
      console.error('Failed to get processes', err);
      return [];
    }
  }

  async killProcess(pid) {
    const numericPid = Number(pid);

    if (!Number.isInteger(numericPid) || numericPid <= 0) {
      return { success: false, error: 'Invalid process ID.' };
    }

    if (PROTECTED_PIDS.has(numericPid)) {
      return { success: false, error: 'Refusing to end a protected system process.' };
    }

    if (numericPid === process.pid) {
      return { success: false, error: 'Refusing to end Soterios itself.' };
    }

    // Look the process up by PID right before killing it, so the name check
    // reflects reality rather than trusting whatever the renderer last sent.
    let target = null;
    try {
      const { default: psList } = await import('ps-list');
      const list = await psList();
      target = list.find((p) => p.pid === numericPid) || null;
    } catch (err) {
      return { success: false, error: 'Unable to verify process before ending it: ' + (err.message || String(err)) };
    }

    if (!target) {
      return { success: false, error: 'Process not found. It may have already exited.' };
    }

    const nameLower = String(target.name || '').toLowerCase();
    if (PROTECTED_NAMES.has(nameLower)) {
      return { success: false, error: `"${target.name}" is a critical system process and cannot be ended from here.` };
    }

    try {
      // taskkill /F is more reliable than process.kill() on Windows for
      // terminating arbitrary third-party processes, including ones that
      // don't respond to a plain terminate signal.
      await execPromise(`taskkill /PID ${numericPid} /F`, { timeout: 10000 });
      return { success: true };
    } catch (err) {
      const message = (err.stderr && err.stderr.trim()) || err.message || 'Unknown error ending process.';
      return { success: false, error: message };
    }
  }
}

module.exports = ProcessInspector;