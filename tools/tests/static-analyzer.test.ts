import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { runStaticCodeAnalysis } from '../src/code/static-analyzer';

describe('Static Code Analyzer (JSX / TSX / HTML)', () => {
  it('detects disabled buttons without explanation (Rule 1)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ergo-test-'));
    const testFile = path.join(tempDir, 'ButtonComponent.tsx');
    fs.writeFileSync(testFile, 'export function Comp() { return <button disabled>Submit</button>; }');

    const findings = runStaticCodeAnalysis(testFile);
    expect(findings.length).toBeGreaterThan(0);
    const finding = findings.find((f) => f.title.includes('Bouton désactivé'));
    expect(finding).toBeDefined();
    expect(finding?.axis).toBe('axis-1');
    expect(finding?.severity).toBe(2);
    expect(finding?.isQuickWin).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects clickable div/span without keyboard navigation (Rule 2)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ergo-test-'));
    const testFile = path.join(tempDir, 'ClickableDiv.tsx');
    fs.writeFileSync(testFile, 'export function Comp() { return <div onClick={() => alert("clicked")}>Click me</div>; }');

    const findings = runStaticCodeAnalysis(testFile);
    expect(findings.length).toBeGreaterThan(0);
    const finding = findings.find((f) => f.title.includes('gestion du clavier'));
    expect(finding).toBeDefined();
    expect(finding?.axis).toBe('axis-8');
    expect(finding?.severity).toBe(3);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects destructive button actions without confirmation (Rule 3)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ergo-test-'));
    const testFile = path.join(tempDir, 'DeleteButton.tsx');
    fs.writeFileSync(testFile, 'export function Comp() { return <button id="delete-btn" onClick={() => remove()}>supprimer</button>; }');

    const findings = runStaticCodeAnalysis(testFile);
    expect(findings.length).toBeGreaterThan(0);
    const finding = findings.find((f) => f.title.includes('Action destructive'));
    expect(finding).toBeDefined();
    expect(finding?.axis).toBe('axis-3');
    expect(finding?.severity).toBe(3);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('analyzes fixture file BadCheckoutForm.tsx successfully', () => {
    const fixturePath = path.resolve(__dirname, '../../examples/demo-app/BadCheckoutForm.tsx');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const findings = runStaticCodeAnalysis(fixturePath);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});
