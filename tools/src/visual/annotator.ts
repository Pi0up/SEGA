import { Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { Finding, NielsenSeverity, VisualMarker } from '../types';

/**
 * Retourne la couleur hexadécimale associée à la sévérité Nielsen
 */
export function getSeverityColor(severity: NielsenSeverity): string {
  switch (severity) {
    case 4:
      return '#ef4444'; // Rouge vif (Catastrophe)
    case 3:
      return '#f97316'; // Orange vif (Majeur)
    case 2:
      return '#eab308'; // Jaune ambré (Mineur)
    case 1:
      return '#3b82f6'; // Bleu royal (Cosmétique)
    default:
      return '#ef4444';
  }
}

/**
 * Retourne l'emoji associé à la sévérité Nielsen
 */
export function getSeverityMarkerEmoji(severity: NielsenSeverity): string {
  switch (severity) {
    case 4:
      return '🚨';
    case 3:
      return '⚠️';
    case 2:
      return '💡';
    case 1:
      return '🎨';
    default:
      return '📍';
  }
}

export interface MarkerAnnotationResult {
  annotatedScreenshotPath: string;
  snippets: Array<{
    findingId: string;
    path: string;
    title: string;
    markerNumber: number;
  }>;
}

interface DomMarkerDescriptor {
  id: string;
  markerNumber: number;
  selector: string;
  severity: NielsenSeverity;
  color: string;
  title: string;
}

interface LocatedMarker {
  id: string;
  markerNumber: number;
  color: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Injecte des marqueurs visuels dans la page active Playwright, capture la vue annotée
 * et génère des extraits (snippets) ciblés pour chaque anomalie localisée.
 */
export async function annotateAndCaptureScreenshots(
  page: Page,
  findings: Finding[],
  screenshotsDir: string,
  prefix: 'desktop' | 'mobile' = 'desktop'
): Promise<MarkerAnnotationResult> {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Préparer la liste des marqueurs potentiels (ayant un sélecteur DOM)
  const markerDescriptors: DomMarkerDescriptor[] = [];
  let markerCounter = 1;

  for (const f of findings) {
    const rawSelector = f.selector || f.location;
    if (rawSelector && !rawSelector.includes('Console') && !rawSelector.includes('Viewport')) {
      markerDescriptors.push({
        id: f.id,
        markerNumber: markerCounter++,
        selector: rawSelector,
        severity: f.severity,
        color: getSeverityColor(f.severity),
        title: f.title
      });
    }
  }

  // 2. Évaluer et injecter l'overlay dans le DOM du navigateur
  const locatedMarkers: LocatedMarker[] = await page.evaluate((descriptors: DomMarkerDescriptor[]) => {
    const OVERLAY_ID = '__sega_audit_markers_overlay__';
    const oldOverlay = document.getElementById(OVERLAY_ID);
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${Math.max(document.documentElement.scrollWidth, window.innerWidth)}px;
      height: ${Math.max(document.documentElement.scrollHeight, window.innerHeight)}px;
      pointer-events: none;
      z-index: 2147483647;
      overflow: visible;
    `;
    document.body.appendChild(overlay);

    const located: LocatedMarker[] = [];

    // Fonction de résolution flexible de sélecteurs (Axe, CSS, Tag)
    function resolveElement(selectorStr: string): Element | null {
      try {
        if (selectorStr.startsWith('/') || selectorStr.startsWith('(')) {
          // Évaluation XPath
          const result = document.evaluate(selectorStr, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue as Element | null;
        }
        return document.querySelector(selectorStr);
      } catch {
        // En cas de sélecteur complexe avec virgules ou pseudo-classes non standard
        const parts = selectorStr.split(',').map((s) => s.trim());
        for (const p of parts) {
          try {
            const el = document.querySelector(p);
            if (el) return el;
          } catch {
            // Continuer
          }
        }
        return null;
      }
    }

    for (const item of descriptors) {
      const el = resolveElement(item.selector);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      // Ignorer les éléments de taille nulle ou invisibles
      if (rect.width === 0 && rect.height === 0) continue;

      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const absoluteX = rect.left + scrollX;
      const absoluteY = rect.top + scrollY;
      const targetWidth = Math.max(rect.width, 24);
      const targetHeight = Math.max(rect.height, 24);

      // Boîte de délimitation (Cadre visuel)
      const box = document.createElement('div');
      box.className = '__sega_marker_box__';
      box.dataset.findingId = item.id;
      box.dataset.markerNumber = String(item.markerNumber);
      box.style.cssText = `
        position: absolute;
        left: ${Math.max(0, absoluteX - 4)}px;
        top: ${Math.max(0, absoluteY - 4)}px;
        width: ${targetWidth + 8}px;
        height: ${targetHeight + 8}px;
        border: 3px solid ${item.color};
        border-radius: 8px;
        background-color: ${item.color}22;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 4px 18px rgba(0, 0, 0, 0.4);
        box-sizing: border-box;
        pointer-events: none;
      `;

      // Badge / Pin en pilule
      const badge = document.createElement('div');
      badge.className = '__sega_marker_badge__';
      const badgeTop = absoluteY > 36 ? '-32px' : '4px';
      badge.style.cssText = `
        position: absolute;
        left: -2px;
        top: ${badgeTop};
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background-color: ${item.color};
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        padding: 5px 10px;
        border-radius: 9999px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
        border: 2px solid #ffffff;
        white-space: nowrap;
        z-index: 2147483648;
      `;
      badge.innerHTML = `<span style="font-size:13px;">#${item.markerNumber}</span> <span style="opacity:0.95;font-weight:600;">${item.id}</span>`;

      box.appendChild(badge);
      overlay.appendChild(box);

      located.push({
        id: item.id,
        markerNumber: item.markerNumber,
        color: item.color,
        boundingBox: {
          x: Math.round(absoluteX),
          y: Math.round(absoluteY),
          width: Math.round(targetWidth),
          height: Math.round(targetHeight)
        }
      });
    }

    return located;
  }, markerDescriptors);

  // 3. Capturer la vue globale annotée
  const annotatedScreenshotPath = path.join(screenshotsDir, `screenshot-${prefix}-annotated.png`);
  await page.screenshot({ path: annotatedScreenshotPath, fullPage: false });

  // 4. Capturer les extraits ciblés (snippets) pour chaque constat localisé
  const snippets: Array<{ findingId: string; path: string; title: string; markerNumber: number }> = [];
  const viewport = page.viewportSize() || { width: 1440, height: 900 };

  for (const marker of locatedMarkers) {
    const finding = findings.find((f) => f.id === marker.id);
    if (!finding) continue;

    const snippetFilename = `marker-${finding.id}.png`;
    const snippetPath = path.join(screenshotsDir, snippetFilename);

    try {
      // Défiler pour amener l'élément au centre du viewport si nécessaire
      await page.evaluate((coords) => {
        const targetScrollY = Math.max(0, coords.y - 120);
        window.scrollTo({ left: 0, top: targetScrollY, behavior: 'instant' as ScrollBehavior });
      }, marker.boundingBox);

      // Recalculer les coordonnées de capture relative au viewport après scroll
      const clientRect = await page.evaluate((id) => {
        const box = document.querySelector(`.__sega_marker_box__[data-finding-id="${id}"]`);
        if (!box) return null;
        const r = box.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      }, finding.id);

      if (clientRect) {
        // Appliquer une marge contextuelle autour de l'élément (padding 40px)
        const padX = 40;
        const padY = 50;
        const clipX = Math.max(0, Math.floor(clientRect.x - padX));
        const clipY = Math.max(0, Math.floor(clientRect.y - padY));
        const clipWidth = Math.min(viewport.width - clipX, Math.max(220, Math.ceil(clientRect.width + padX * 2)));
        const clipHeight = Math.min(viewport.height - clipY, Math.max(140, Math.ceil(clientRect.height + padY * 2)));

        if (clipWidth > 0 && clipHeight > 0) {
          await page.screenshot({
            path: snippetPath,
            clip: {
              x: clipX,
              y: clipY,
              width: clipWidth,
              height: clipHeight
            }
          });

          // Stocker le marqueur visuel sur l'objet Finding
          const relativePath = path.join('screenshots', snippetFilename).replace(/\\/g, '/');
          const visualMarker: VisualMarker = {
            markerNumber: marker.markerNumber,
            badgeLabel: `#${marker.markerNumber} ${finding.id}`,
            severity: finding.severity,
            color: marker.color,
            boundingBox: marker.boundingBox,
            screenshotPath: relativePath,
            fullScreenshotPath: snippetPath
          };
          finding.visualMarker = visualMarker;

          snippets.push({
            findingId: finding.id,
            path: relativePath,
            title: finding.title,
            markerNumber: marker.markerNumber
          });
        }
      }
    } catch (err) {
      console.warn(`[Ergo-Review] Avertissement: Impossible de capturer le snippet pour ${finding.id}:`, err);
    }
  }

  // 5. Nettoyer l'overlay de la page
  await page.evaluate(() => {
    const overlay = document.getElementById('__sega_audit_markers_overlay__');
    if (overlay) overlay.remove();
  });

  return {
    annotatedScreenshotPath,
    snippets
  };
}
