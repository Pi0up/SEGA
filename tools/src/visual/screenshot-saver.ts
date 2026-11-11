import * as fs from 'fs';
import * as path from 'path';
import { Page } from 'playwright';

export interface SavedScreenshotResult {
  fullPath: string;
  filename: string;
  relativePath: string;
}

export interface ScreenshotSaverOptions {
  relativeDir?: string;
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Sauvegarde de manière résiliente un buffer de capture d'écran sur disque.
 * 
 * Cette fonction prévient et gère spécifiquement les verrous système, les violations
 * de partage et les fichiers mappés en mémoire (courants sous Windows lors de la
 * prévisualisation dans VS Code, visionneuses d'images ou scans antivirus) :
 * - Garantit la création récursive du répertoire cible
 * - Tente l'écriture directe
 * - En cas d'erreur de verrouillage (UNKNOWN / errno -4094, EBUSY, EPERM, EACCES) :
 *   1. Tente une suppression préalable (unlink)
 *   2. Tente une réécriture après un court délai (retry backoff)
 *   3. En dernier recours, génère un nom d'alternative horodaté (fallback) pour
 *      garantir qu'aucun snippet/capture n'est perdu lors de l'audit.
 */
export async function saveScreenshotSafely(
  targetPath: string,
  buffer: Buffer,
  options?: ScreenshotSaverOptions
): Promise<SavedScreenshotResult> {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const relativeDir = options?.relativeDir || 'screenshots';
  const originalFilename = path.basename(targetPath);
  const maxRetries = options?.retries ?? 2;
  const retryDelay = options?.retryDelayMs ?? 80;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.writeFile(targetPath, buffer);
      return {
        fullPath: targetPath,
        filename: originalFilename,
        relativePath: path.join(relativeDir, originalFilename).replace(/\\/g, '/')
      };
    } catch (err: any) {
      const isLockError =
        err &&
        (err.code === 'UNKNOWN' ||
          err.code === 'EBUSY' ||
          err.code === 'EPERM' ||
          err.code === 'EACCES' ||
          err.errno === -4094 ||
          err.syscall === 'open');

      if (!isLockError && attempt === 0) {
        throw err;
      }

      // Tenter un déverrouillage via unlink si le fichier existe déjà
      try {
        if (fs.existsSync(targetPath)) {
          await fs.promises.unlink(targetPath);
        }
      } catch {
        // Ignorer si unlink est également bloqué par le verrou
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Si le fichier cible est strictement verrouillé (ex: aperçu VS Code / Electron actif),
  // générer un nom alternatif pour ne jamais perdre le snippet d'audit
  const ext = path.extname(targetPath) || '.png';
  const base = path.basename(targetPath, ext);
  const fallbackFilename = `${base}-${Date.now().toString(36)}${ext}`;
  const fallbackPath = path.join(dir, fallbackFilename);

  await fs.promises.writeFile(fallbackPath, buffer);
  return {
    fullPath: fallbackPath,
    filename: fallbackFilename,
    relativePath: path.join(relativeDir, fallbackFilename).replace(/\\/g, '/')
  };
}

/**
 * Capture une capture d'écran via Playwright et l'enregistre sur disque de manière résiliente.
 * En ne passant jamais directement d'option `path` à Playwright, on évite les plantages
 * directs du moteur Playwright lors de violations de partage sur le système de fichiers hôte.
 */
export async function captureAndSaveScreenshot(
  page: Page,
  targetPath: string,
  screenshotOptions?: Parameters<Page['screenshot']>[0],
  saverOptions?: ScreenshotSaverOptions
): Promise<SavedScreenshotResult> {
  // Retirer `path` pour que Playwright retourne un Buffer sans interagir avec fs
  const { path: _ignoredPath, ...optionsWithoutPath } = screenshotOptions || {};
  const buffer = await page.screenshot(optionsWithoutPath);
  return saveScreenshotSafely(targetPath, buffer, saverOptions);
}
