const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async function clearTemp(args = {}) {
  const maxAgeDays = args.maxAgeDays ?? 7;
  const dryRun = args.dryRun !== false;
  const tempDir = os.tmpdir();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const log = [];
  let freedBytes = 0, deletedCount = 0, skippedCount = 0;
  let entries;
  try { entries = fs.readdirSync(tempDir, { withFileTypes: true }); } catch (err) { return { error: `Could not read temp directory: ${err.message}`, log }; }
  for (const entry of entries) {
    const fullPath = path.join(tempDir, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      if (stat.mtimeMs > cutoff) { skippedCount++; continue; }
      if (dryRun) log.push(`[DRY RUN] Would delete: ${fullPath} (${stat.size} bytes)`);
      else { fs.unlinkSync(fullPath); log.push(`Deleted: ${fullPath} (${stat.size} bytes)`); }
      freedBytes += stat.size; deletedCount++;
    } catch (err) { log.push(`Skipped (locked or permission denied): ${fullPath}`); skippedCount++; }
  }
  return { dryRun, tempDir, deletedCount, skippedCount, freedBytes, freedMB: +(freedBytes / 1e6).toFixed(2), log };
};
