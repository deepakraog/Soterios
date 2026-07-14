const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const ScanEngine = require('../src/security/ScanEngine');
const ClamAVEngine = require('../src/security/ClamAVEngine');

class FakeClamEngine extends ClamAVEngine {
  constructor() {
    super({});
    this.isReady = true;
    this.pendingResolve = null;
  }

  hasVirusDatabase() {
    return true;
  }

  async scanFile() {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }
}

describe('Scan cancellation cleanup', () => {
  it('resets scanning state and emits scan:canceled', async () => {
    const fakeClam = new FakeClamEngine();
    const eventBus = new EventEmitter();
    const events = [];
    eventBus.on('scan:canceled', (payload) => events.push(payload));
    eventBus.on('scan:complete', (payload) => events.push(payload));

    const scanEngine = new ScanEngine(
      {
        getSetting: () => false,
        logScan: () => {},
        addScanReport: () => {}
      },
      eventBus,
      fakeClam,
      { analyze: async () => ({ score: 0, signals: [] }) },
      { checkHash: async () => null },
      { quarantine: async () => ({ success: true }) }
    );

    const scanPromise = scanEngine.runCustomScan(['C:\\temp']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    scanEngine.abortScan();
    fakeClam.cancelRequested = true;
    fakeClam.pendingResolve({
      success: false,
      canceled: true,
      error: 'Scan canceled',
      threatsFound: 0,
      filesScanned: 0,
      output: ''
    });

    const result = await scanPromise;
    assert.equal(result.canceled, true);
    assert.equal(scanEngine.getStatus().isScanning, false);
    assert.equal(scanEngine.abortController, null);
    assert.ok(events.some((event) => event.status === 'canceled'));
  });
});

describe('ClamAVEngine.abortCurrentScan', () => {
  it('marks active scans as canceled', () => {
    const engine = new ClamAVEngine({});
    engine.activeScanProcess = {
      kill() {}
    };

    const killed = engine.abortCurrentScan();
    assert.equal(killed, true);
    assert.equal(engine.cancelRequested, true);
  });
});
