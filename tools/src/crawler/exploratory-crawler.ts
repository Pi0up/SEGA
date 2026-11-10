import { chromium, Browser } from 'playwright';
import * as path from 'path';
import {
  Finding,
  WcagReportData,
  WcagViolation,
  ExploredPage,
  CrawlSummary
} from '../types';
import { auditSinglePage } from './page-auditor';
import { normalizeUrl } from './link-extractor';

export interface ExploratoryCrawlerOptions {
  startUrl: string;
  outputDir: string;
  maxPages?: number;
  maxDepth?: number;
  sameOrigin?: boolean;
  allowedPatterns?: string[];
  disallowedPatterns?: string[];
  wcag?: {
    enabled: boolean;
    standard?: string;
  };
  onPageProgress?: (current: number, total: number, url: string, title: string) => void;
}

export interface MultiPageCrawlResult {
  findings: Finding[];
  screenshots: {
    desktop: string;
    mobile: string;
  };
  crawl: CrawlSummary;
  wcag?: WcagReportData;
}

interface QueueItem {
  url: string;
  depth: number;
  referrer?: string;
}

export async function runExploratoryCrawl(
  options: ExploratoryCrawlerOptions
): Promise<MultiPageCrawlResult> {
  const maxPages = Math.max(1, options.maxPages ?? 5);
  const maxDepth = Math.max(0, options.maxDepth ?? 2);
  const sameOrigin = options.sameOrigin !== false;

  const normalizedStart = normalizeUrl(options.startUrl) || options.startUrl;
  const parsedStart = new URL(normalizedStart);
  const startOrigin = parsedStart.protocol === 'file:' ? normalizedStart : parsedStart.origin;

  const queue: QueueItem[] = [{ url: normalizedStart, depth: 0 }];
  const visited = new Set<string>();
  const queued = new Set<string>([normalizedStart]);

  const exploredPages: ExploredPage[] = [];
  const rawFindings: Finding[] = [];
  const wcagReports: WcagReportData[] = [];

  let findingCounter = 1;
  const nextId = () => `SPEC-${String(findingCounter++).padStart(2, '0')}`;

  const browser: Browser = await chromium.launch({ headless: true });

  let primaryDesktopScreenshot = '';
  let primaryMobileScreenshot = '';

  try {
    while (queue.length > 0 && exploredPages.length < maxPages) {
      const item = queue.shift()!;
      if (visited.has(item.url)) {
        continue;
      }
      visited.add(item.url);

      const pageIndex = exploredPages.length + 1;

      console.log(
        `[Ergo-Review] 🌐 Exploration [${pageIndex}/${maxPages}] : ${item.url} (Profondeur ${item.depth})...`
      );

      try {
        const pageResult = await auditSinglePage(browser, {
          url: item.url,
          startOrigin,
          pageIndex,
          outputDir: options.outputDir,
          wcag: options.wcag,
          crawlOptions: {
            sameOrigin,
            allowedPatterns: options.allowedPatterns,
            disallowedPatterns: options.disallowedPatterns
          },
          nextId
        });

        if (pageIndex === 1) {
          primaryDesktopScreenshot = pageResult.screenshots.desktop;
          primaryMobileScreenshot = pageResult.screenshots.mobile;
        }

        if (options.onPageProgress) {
          options.onPageProgress(pageIndex, maxPages, item.url, pageResult.title);
        }

        console.log(
          `[Ergo-Review]  ↳ Titre : "${pageResult.title}" | Problèmes : ${pageResult.findings.length} | Liens découverts : ${pageResult.discoveredLinks.length}`
        );

        exploredPages.push({
          url: pageResult.url,
          path: pageResult.path,
          title: pageResult.title,
          status: pageResult.status,
          depth: item.depth,
          durationMs: pageResult.durationMs,
          findingsCount: pageResult.findings.length,
          wcagViolationsCount: pageResult.wcag?.violationsCount,
          screenshots: pageResult.screenshots
        });

        rawFindings.push(...pageResult.findings);
        if (pageResult.wcag) {
          wcagReports.push(pageResult.wcag);
        }

        // Ajouter les nouveaux liens découverts dans la file d'attente
        if (item.depth < maxDepth && exploredPages.length + queue.length < maxPages * 3) {
          for (const link of pageResult.discoveredLinks) {
            if (!visited.has(link) && !queued.has(link)) {
              queued.add(link);
              queue.push({
                url: link,
                depth: item.depth + 1,
                referrer: item.url
              });
            }
          }
        }
      } catch (pageErr) {
        console.warn(`[Ergo-Review] ⚠️ Échec de l'audit sur la page ${item.url} :`, pageErr);
      }
    }
  } finally {
    await browser.close();
  }

  // Consolidation et déduplication des constats multi-pages
  const consolidatedFindings = deduplicateFindings(rawFindings);

  // Consolidation des rapports WCAG
  const consolidatedWcag = consolidateWcagReports(wcagReports, options.wcag?.standard);

  const crawlSummary: CrawlSummary = {
    enabled: true,
    maxPages,
    maxDepth,
    totalPagesExplored: exploredPages.length,
    pages: exploredPages
  };

  return {
    findings: consolidatedFindings,
    screenshots: {
      desktop: primaryDesktopScreenshot,
      mobile: primaryMobileScreenshot
    },
    crawl: crawlSummary,
    wcag: consolidatedWcag
  };
}

/**
 * Déduplique les anomalies détectées sur plusieurs pages (ex: header/nav/footer partagés)
 */
function deduplicateFindings(findings: Finding[]): Finding[] {
  const map = new Map<string, Finding>();

  for (const f of findings) {
    // Nettoyer la localisation pour extraire le sélecteur brut sans le tag [Page: ...]
    const cleanLocation = f.location.replace(/\s*\[Page:\s*[^\]]+\]/, '').trim();
    const key = `${f.axis}|${f.bastienScapinRule}|${f.title}|${cleanLocation}`;

    const existing = map.get(key);
    if (!existing) {
      const page = f.pageUrl || 'Page principale';
      map.set(key, {
        ...f,
        affectedPages: [page],
        location: cleanLocation
      });
    } else {
      const currentPages = existing.affectedPages || [];
      const newPage = f.pageUrl || 'Page principale';
      if (!currentPages.includes(newPage)) {
        currentPages.push(newPage);
        existing.affectedPages = currentPages;
      }
    }
  }

  // Reformater la localisation pour indiquer le nombre de pages impactées si > 1
  return Array.from(map.values()).map((f) => {
    if (f.affectedPages && f.affectedPages.length > 1) {
      const paths = f.affectedPages.map((u) => {
        try {
          return new URL(u).pathname || u;
        } catch {
          return u;
        }
      });
      return {
        ...f,
        location: `${f.location} (Impacte ${f.affectedPages.length} pages : ${paths.slice(0, 3).join(', ')}${paths.length > 3 ? '...' : ''})`
      };
    }
    return f;
  });
}

/**
 * Consolide les rapports WCAG multi-pages en un rapport unique
 */
function consolidateWcagReports(
  reports: WcagReportData[],
  standardDefault?: string
): WcagReportData | undefined {
  if (reports.length === 0) {
    return undefined;
  }

  const standard = reports[0].standard || standardDefault || 'WCAG 2.1 AA';
  const violationsMap = new Map<string, WcagViolation>();

  let totalPasses = 0;
  let totalIncomplete = 0;

  for (const rep of reports) {
    totalPasses += rep.passesCount;
    totalIncomplete += rep.incompleteCount;

    for (const v of rep.violations) {
      const existing = violationsMap.get(v.id);
      if (!existing) {
        violationsMap.set(v.id, {
          ...v,
          nodes: [...v.nodes],
          nodesCount: v.nodesCount
        });
      } else {
        existing.nodesCount += v.nodesCount;
        existing.nodes.push(...v.nodes);
      }
    }
  }

  const violations = Array.from(violationsMap.values());
  const violationsCount = violations.length;
  const testedRulesCount = totalPasses + violationsCount + totalIncomplete;
  const totalEvaluated = totalPasses + violationsCount;
  const complianceRate = totalEvaluated > 0 ? Math.round((totalPasses / totalEvaluated) * 100) : 100;

  const byPrinciple = {
    perceivable: violations.filter((v) => v.wcagPrinciple === 'Perceptible').length,
    operable: violations.filter((v) => v.wcagPrinciple === 'Utilisable').length,
    understandable: violations.filter((v) => v.wcagPrinciple === 'Compréhensible').length,
    robust: violations.filter((v) => v.wcagPrinciple === 'Robuste').length
  };

  const byImpact = {
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious: violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor: violations.filter((v) => v.impact === 'minor').length
  };

  return {
    enabled: true,
    standard,
    testedRulesCount,
    passesCount: totalPasses,
    violationsCount,
    incompleteCount: totalIncomplete,
    complianceRate,
    violations,
    byPrinciple,
    byImpact
  };
}
