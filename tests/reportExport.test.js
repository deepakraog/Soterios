const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  threatsToCsv,
  csvEscape,
  isThreatQuarantined,
  csvPathForJson,
  pdfPathForHtml,
  isPathInScanReportsDir
} = require('../src/security/reportExport');

describe('reportExport CSV', () => {
  test('serializes threat entries with expected columns', () => {
    const csv = threatsToCsv({
      status: 'completed',
      threats: [
        { name: 'Eicar-Test-Signature', path: 'C:\\temp\\eicar.com' }
      ],
      errors: []
    });

    expect(csv).toBe(
      'name,path,quarantined\n' +
      'Eicar-Test-Signature,C:\\temp\\eicar.com,true\n'
    );
  });

  test('exports header only for empty threat lists', () => {
    expect(threatsToCsv({ status: 'completed', threats: [], errors: [] }))
      .toBe('name,path,quarantined\n');
  });

  test('escapes commas and quotes in CSV values', () => {
    const csv = threatsToCsv({
      status: 'completed',
      threats: [{ name: 'Threat, "A"', path: 'C:\\dir\\file, test.exe' }],
      errors: []
    });

    expect(csv).toContain('"Threat, ""A"""');
    expect(csv).toContain('"C:\\dir\\file, test.exe"');
  });

  test('marks quarantined false when quarantine failed', () => {
    const quarantined = isThreatQuarantined(
      { name: 'Bad', path: 'C:\\infected.exe' },
      {
        status: 'completed',
        errors: ['Failed to quarantine C:\\infected.exe: access denied']
      }
    );

    expect(quarantined).toBe(false);
  });

  test('derives export paths from report files', () => {
    expect(csvPathForJson('C:\\reports\\scan-quick-1.json')).toBe('C:\\reports\\scan-quick-1.csv');
    expect(pdfPathForHtml('C:\\reports\\scan-quick-1.html')).toBe('C:\\reports\\scan-quick-1.pdf');
  });

  test('validates scan report directory membership', () => {
    const dir = path.join(os.homedir(), '.soterios', 'scan-reports');
    const inside = path.join(dir, 'scan-quick-test.json');
    expect(isPathInScanReportsDir(inside)).toBe(true);
    expect(isPathInScanReportsDir('C:\\Windows\\System32\\evil.json')).toBe(false);
  });
});

describe('reportExport PDF helpers', () => {
  test('missing HTML report paths fail path validation', () => {
    expect(isPathInScanReportsDir('/tmp/not-a-report.html')).toBe(false);
  });

  test('csv can be written to scan reports directory', () => {
    const dir = path.join(os.homedir(), '.soterios', 'scan-reports');
    fs.mkdirSync(dir, { recursive: true });
    const jsonPath = path.join(dir, 'jest-export-test.json');
    const csvPath = csvPathForJson(jsonPath);
    const csv = threatsToCsv({ status: 'completed', threats: [], errors: [] });

    fs.writeFileSync(csvPath, csv, 'utf8');
    expect(fs.existsSync(csvPath)).toBe(true);
    expect(fs.readFileSync(csvPath, 'utf8')).toBe('name,path,quarantined\n');
    fs.unlinkSync(csvPath);
  });
});
