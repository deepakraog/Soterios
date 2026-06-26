# Soterios System Tools

A local-first Windows desktop app for system maintenance, monitoring, and basic security checks. Built with Electron.

## What it does

- **Security Dashboard** — Overall score from Defender status, firewall profiles, Windows Update, scan history, and system health
- **Action Center** — Prioritized recommendations with direct navigation to the relevant page
- **File Scanner** — SHA-256 signature matching, entropy analysis, heuristic risk scoring, quarantine, and scan history
- **Passwords** — Cryptographically random password generator and offline strength checker
- **Quarantine** — Manage isolated files: restore or permanently delete
- **System Monitor** — Live CPU, memory, disk, and OS info with auto-refresh
- **Processes** — Running processes with risk scoring
- **Maintenance Scripts** — On-demand temp cleanup, disk space report, large files, browser cache, network report, and Windows services report

**No telemetry. No network calls. All data stays on your machine.**

## Build from source

### Prerequisites
- Node.js 22+
- Windows (for the Windows installer — cross-compilation is not supported by electron-builder for NSIS)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Run locally
npm start

# 3. Build an unpacked Windows app (faster, no installer)
npm run pack

# 4. Build the production Windows installer (.exe)
npm run dist:win
```

The installer is written to `dist/Soterios System Tools-Setup-1.0.1.exe`.

### GitHub Actions

Push a tag starting with `v` to trigger an automated build and GitHub Release:

```bash
git tag v1.0.1
git push origin v1.0.1
```

The workflow is in `.github/workflows/release.yml`.

## Project structure

```
main.js              Electron main process + IPC handlers
preload.js           contextBridge API exposed to the renderer
src/
  core/              Tool registry, plugin loader, app data store
  tools/             Security, system, scanner, report, and maintenance tools
  security/          Windows check helpers (Defender, firewall, updates, signatures)
  av/                Local file scanner and signature database
  scripts/           Maintenance script registry + implementations
  ui/
    pages/           shell.html — the app's single HTML entry point
    css/             style.css
    js/              api.js, components.js, router.js, state.js
    js/pages/        One JS module per page (dashboard, scanner, etc.)
assets/              App icons
build/               electron-builder resources (LICENSE.txt)
.github/workflows/   CI/CD release workflow
```

## Adding signatures

Edit `src/av/signatureDB.json` and add entries:

```json
{ "name": "My Signature", "hash": "<sha256-lowercase-hex>" }
```

The EICAR test hash is included by default so you can verify the scanner works end-to-end.

## Security notes

- Defender/firewall/update checks use PowerShell with three fallback strategies, so they work even without elevation
- The file scanner is a local heuristic tool, not a replacement for Microsoft Defender
- Quarantined files are moved (not copied) to `~/.soterios-quarantine`
