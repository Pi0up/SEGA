import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { saveScreenshotSafely, captureAndSaveScreenshot } from '../src/visual/screenshot-saver';
import { Page } from 'playwright';

describe('Screenshot Saver (Resilient File Writer)', () => {
  const testOutputDir = path.resolve(__dirname, '.test-screenshots');

  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('creates the directory and saves screenshot buffer cleanly', async () => {
    const targetFile = path.join(testOutputDir, 'marker-SPEC-01.png');
    const mockBuffer = Buffer.from('fake-png-content');

    const result = await saveScreenshotSafely(targetFile, mockBuffer);

    expect(result.fullPath).toBe(targetFile);
    expect(result.filename).toBe('marker-SPEC-01.png');
    expect(result.relativePath).toBe('screenshots/marker-SPEC-01.png');
    expect(fs.existsSync(targetFile)).toBe(true);
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('fake-png-content');
  });

  it('overwrites existing screenshot when file is not locked', async () => {
    const targetFile = path.join(testOutputDir, 'marker-SPEC-02.png');
    fs.mkdirSync(testOutputDir, { recursive: true });
    fs.writeFileSync(targetFile, 'old-content');

    const newBuffer = Buffer.from('new-content');
    const result = await saveScreenshotSafely(targetFile, newBuffer);

    expect(result.fullPath).toBe(targetFile);
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('new-content');
  });

  it('recovers with fallback filename when target file throws UNKNOWN error (errno -4094)', async () => {
    const targetFile = path.join(testOutputDir, 'marker-SPEC-01.png');
    fs.mkdirSync(testOutputDir, { recursive: true });
    fs.writeFileSync(targetFile, 'locked-content');

    const originalWriteFile = fs.promises.writeFile;
    // Simuler l'erreur Windows UNKNOWN (errno -4094, syscall 'open') sur le fichier verrouillé
    const writeFileSpy = vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (filePath, data, options) => {
      if (typeof filePath === 'string' && path.normalize(filePath) === path.normalize(targetFile)) {
        const err: any = new Error("UNKNOWN: unknown error, open '" + targetFile + "'");
        err.code = 'UNKNOWN';
        err.errno = -4094;
        err.syscall = 'open';
        throw err;
      }
      return originalWriteFile.call(fs.promises, filePath, data, options);
    });

    const newBuffer = Buffer.from('resilient-content');
    const result = await saveScreenshotSafely(targetFile, newBuffer, { retries: 1, retryDelayMs: 10 });

    expect(result.fullPath).not.toBe(targetFile);
    expect(result.filename).toMatch(/^marker-SPEC-01-[a-z0-9]+\.png$/);
    expect(result.relativePath).toMatch(/^screenshots\/marker-SPEC-01-[a-z0-9]+\.png$/);
    expect(fs.existsSync(result.fullPath)).toBe(true);
    expect(fs.readFileSync(result.fullPath, 'utf-8')).toBe('resilient-content');
  });

  it('recovers with fallback filename on EBUSY or EPERM locking errors', async () => {
    const targetFile = path.join(testOutputDir, 'screenshot-desktop.png');
    fs.mkdirSync(testOutputDir, { recursive: true });

    const originalWriteFile = fs.promises.writeFile;
    vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (filePath, data, options) => {
      if (typeof filePath === 'string' && path.normalize(filePath) === path.normalize(targetFile)) {
        const err: any = new Error('resource busy or locked');
        err.code = 'EBUSY';
        err.syscall = 'open';
        throw err;
      }
      return originalWriteFile.call(fs.promises, filePath, data, options);
    });

    const buffer = Buffer.from('desktop-bytes');
    const result = await saveScreenshotSafely(targetFile, buffer, { retries: 0 });

    expect(result.fullPath).not.toBe(targetFile);
    expect(result.filename).toMatch(/^screenshot-desktop-[a-z0-9]+\.png$/);
    expect(fs.existsSync(result.fullPath)).toBe(true);
  });

  it('captureAndSaveScreenshot strips path option and captures memory buffer safely', async () => {
    const targetFile = path.join(testOutputDir, 'captured.png');
    const mockPage = {
      screenshot: vi.fn().mockImplementation(async (options: any) => {
        // Vérifier que 'path' a été retiré pour ne jamais déléguer l'écriture à Playwright
        expect(options?.path).toBeUndefined();
        return Buffer.from('captured-from-playwright');
      })
    } as unknown as Page;

    const result = await captureAndSaveScreenshot(
      mockPage,
      targetFile,
      { path: 'should-be-stripped.png', fullPage: false }
    );

    expect(mockPage.screenshot).toHaveBeenCalledTimes(1);
    expect(result.fullPath).toBe(targetFile);
    expect(fs.readFileSync(targetFile, 'utf-8')).toBe('captured-from-playwright');
  });
});
