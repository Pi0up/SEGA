import { Page } from 'playwright';

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.mp4',
  '.mp3',
  '.wav',
  '.avi',
  '.mov',
  '.css',
  '.js',
  '.json',
  '.xml',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
]);

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  '_ga',
  '_gl',
  'mc_eid',
  'mc_cid'
]);

/**
 * Normalise une URL pour éviter les doublons dus au hash, slash de fin ou tags de tracking
 */
export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    let urlToParse = rawUrl.trim();
    if (!urlToParse) {
      return null;
    }

    // Si aucune baseUrl n'est fournie et que la chaîne n'a pas de protocole explicite,
    // inférer http:// pour localhost/IP et https:// pour les noms d'hôtes standards.
    if (!baseUrl) {
      if (
        urlToParse.startsWith('localhost') ||
        urlToParse.startsWith('127.0.0.1') ||
        urlToParse.startsWith('0.0.0.0') ||
        urlToParse.startsWith('::1')
      ) {
        urlToParse = `http://${urlToParse}`;
      } else if (
        !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(urlToParse) &&
        !urlToParse.startsWith('/') &&
        !urlToParse.startsWith('.')
      ) {
        urlToParse = `https://${urlToParse}`;
      }
    }

    const parsed = new URL(urlToParse, baseUrl);

    // Uniquement http, https et file
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'file:') {
      return null;
    }

    // Supprimer le hash
    parsed.hash = '';

    // Supprimer les paramètres de tracking
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    // Normaliser le chemin (enlever le trailing slash sauf pour la racine)
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Détermine si une URL est éligible à l'exploration
 */
export function isValidCrawlTarget(
  targetUrl: string,
  startOrigin: string,
  options?: {
    sameOrigin?: boolean;
    allowedPatterns?: string[];
    disallowedPatterns?: string[];
  }
): boolean {
  try {
    const parsed = new URL(targetUrl);

    // Même domaine / origine requis par défaut
    const sameOriginRequired = options?.sameOrigin !== false;
    if (sameOriginRequired) {
      if (parsed.protocol === 'file:') {
        try {
          const startParsed = new URL(startOrigin);
          const startPath = startParsed.pathname;
          const startDir = startPath.substring(0, startPath.lastIndexOf('/'));
          if (!parsed.pathname.startsWith(startDir)) {
            return false;
          }
        } catch {
          // Si startOrigin n'est pas une URL valide
        }
      } else if (parsed.origin !== startOrigin) {
        return false;
      }
    }

    // Exclusion des extensions de fichiers binaires, images, médias, etc.
    const pathnameLower = parsed.pathname.toLowerCase();
    for (const ext of IGNORED_EXTENSIONS) {
      if (pathnameLower.endsWith(ext)) {
        return false;
      }
    }

    // Filtres d'exclusion optionnels
    if (options?.disallowedPatterns) {
      for (const pattern of options.disallowedPatterns) {
        if (new RegExp(pattern, 'i').test(targetUrl)) {
          return false;
        }
      }
    }

    // Filtres d'inclusion optionnels
    if (options?.allowedPatterns && options.allowedPatterns.length > 0) {
      const isAllowed = options.allowedPatterns.some((pattern) => new RegExp(pattern, 'i').test(targetUrl));
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extrait tous les liens valides et éligibles depuis le DOM d'une page
 */
export async function extractLinksFromPage(
  page: Page,
  currentUrl: string,
  startOrigin: string,
  options?: {
    sameOrigin?: boolean;
    allowedPatterns?: string[];
    disallowedPatterns?: string[];
  }
): Promise<string[]> {
  try {
    const rawHrefs = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
      return anchors
        .map((a) => a.getAttribute('href') || '')
        .filter((href) => href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
    });

    const discoveredUrls = new Set<string>();

    for (const rawHref of rawHrefs) {
      const normalized = normalizeUrl(rawHref, currentUrl);
      if (normalized && isValidCrawlTarget(normalized, startOrigin, options)) {
        discoveredUrls.add(normalized);
      }
    }

    return Array.from(discoveredUrls);
  } catch (err) {
    return [];
  }
}
