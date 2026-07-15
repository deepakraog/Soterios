'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../src/utils/logger');
const { suspiciousPathSignals } = require('../src/security/windowsChecks');

describe('logger', () => {
  let logFile;

  beforeEach(() => {
    logFile = path.join(os.tmpdir(), `soterios-logger-${Date.now()}.log`);
    logger.configure({ level: 'debug', filePath: logFile });
  });

  it('writes structured lines to an optional log file', () => {
    logger.info('hello', { a: 1 });
    const contents = fs.readFileSync(logFile, 'utf8');
    assert.match(contents, /INFO hello/);
    assert.match(contents, /"a":1/);
  });

  it('respects configured minimum level', () => {
    logger.configure({ level: 'error', filePath: logFile });
    fs.writeFileSync(logFile, '');
    logger.warn('should-skip');
    logger.error('should-appear');
    const contents = fs.readFileSync(logFile, 'utf8');
    assert.equal(contents.includes('should-skip'), false);
    assert.match(contents, /should-appear/);
  });

  it('serializes Error objects with message and stack', () => {
    logger.configure({ level: 'error', filePath: logFile });
    fs.writeFileSync(logFile, '');
    const err = new Error('boom');
    logger.error('failed', err);
    const contents = fs.readFileSync(logFile, 'utf8');
    assert.match(contents, /boom/);
    assert.match(contents, /"stack"/);
  });
});

describe('suspiciousPathSignals', () => {
  it('flags AppData, Temp, and Recycle Bin paths', () => {
    const appdata = suspiciousPathSignals('C:\\Users\\a\\AppData\\Roaming\\evil\\payload.exe');
    assert.ok(appdata.some((s) => /AppData|temporary/i.test(s.message)));

    const recycle = suspiciousPathSignals('C:\\$Recycle.Bin\\S-1-5\\payload.exe');
    assert.ok(recycle.some((s) => /Recycle Bin/i.test(s.message)));
  });
});
