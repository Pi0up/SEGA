import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';
import * as fs from 'fs';
import { Finding, WcagReportData, AuditScreenshotData, AiConfig, AiAnalysisResult, CrawlSummary } from '../types';
import { runWcagAnalysis } from '../wcag';
import { annotateAndCaptureScreenshots, captureAndSaveScreenshot } from '../visual';
import { runAiErgonomicAnalysis } from '../ai';
import { runExploratoryCrawl } from './exploratory-crawler';
import { normalizeUrl } from './link-extractor';

export interface CrawlOptions {
  enabled: boolean;
  maxPages?: number;
  maxDepth?: number;
  sameOrigin?: boolean;
  allowedPatterns?: string[];
  disallowedPatterns?: string[];
}

export interface ProbeOptions {
  url: string;
  outputDir?: string;
  wcag?: {
    enabled: boolean;
    standard?: string;
  };
  ai?: AiConfig;
  crawl?: CrawlOptions;
}

export interface ProbeResult {
  findings: Finding[];
  screenshots: AuditScreenshotData;
  wcag?: WcagReportData;
  crawl?: CrawlSummary;
  aiAnalysis?: AiAnalysisResult;
}

export async function runPlaywrightProbe(options: ProbeOptions): Promise<ProbeResult> {
  const outputDir = options.outputDir || path.resolve(process.cwd(), '.audit-results');
  const targetUrl = normalizeUrl(options.url) || options.url;

  if (options.crawl?.enabled) {
    return runExploratoryCrawl({
      startUrl: targetUrl,
      outputDir,
      maxPages: options.crawl.maxPages,
      maxDepth: options.crawl.maxDepth,
      sameOrigin: options.crawl.sameOrigin,
      allowedPatterns: options.crawl.allowedPatterns,
      disallowedPatterns: options.crawl.disallowedPatterns,
      wcag: options.wcag
    });
  }

  const screenshotsDir = path.join(outputDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const findings: Finding[] = [];
  let findingCounter = 1;
  let wcagReport: WcagReportData | undefined;
  let desktopAnnotated: string | undefined;
  let desktopSnippets: Array<{ findingId: string; path: string; title: string; markerNumber: number }> = [];

  const nextId = () => `SPEC-${String(findingCounter++).padStart(2, '0')}`;

  let desktopScreenshot = path.join(screenshotsDir, 'screenshot-desktop.png');
  let mobileScreenshot = path.join(screenshotsDir, 'screenshot-mobile.png');
  let pageTitle: string | undefined;
  let domSummary: any;
  let aiAnalysisResult: AiAnalysisResult | undefined;

  try {
    // 1. Desktop inspection (1440x900)
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000); // Laisser le temps aux rendus dynamiques et polices
    const savedDesktop = await captureAndSaveScreenshot(page, desktopScreenshot, { fullPage: false });
    desktopScreenshot = savedDesktop.fullPath;

    pageTitle = await page.title().catch(() => undefined);
    domSummary = await page
      .evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean);
        const buttonsCount = document.querySelectorAll('button, [role="button"]').length;
        const linksCount = document.querySelectorAll('a[href]').length;
        const formsCount = document.querySelectorAll('form').length;
        const inputsCount = document.querySelectorAll('input, select, textarea').length;
        const paragraphs = Array.from(document.querySelectorAll('p, span'))
          .map((el) => (el.textContent || '').trim())
          .filter((t) => t.length > 20 && t.length < 150)
          .slice(0, 8);
        return {
          headings,
          buttonsCount,
          linksCount,
          formsCount,
          inputsCount,
          keyTexts: paragraphs
        };
      })
      .catch(() => undefined);

    // Console errors finding (Axe 5 : Gestion des erreurs)
    if (consoleErrors.length > 0) {
      findings.push({
        id: nextId(),
        axis: 'axis-5',
        bastienScapinRule: '5.1 Protection contre les erreurs',
        nielsenRule: '#9 Aider à reconnaître et corriger les erreurs',
        title: 'Erreurs JavaScript console non interceptées en production',
        location: 'Console du navigateur',
        severity: 3,
        effort: 'Moyen',
        isQuickWin: false,
        observation: `${consoleErrors.length} erreur(s) console non gérée(s) : "${consoleErrors[0].substring(0, 100)}..."`,
        expectedBehavior: 'Intercepter toutes les exceptions et afficher un état de secours (Error Boundary) gracieux pour l utilisateur.',
        microCopyBefore: 'Aucun message visuel (erreur silencieuse)',
        microCopyAfter: "Une anomalie temporaire est survenue. L'équipe a été prévenue."
      });
    }

    // 2. Axe-core accessibility & WCAG audit
    if (options.wcag?.enabled) {
      try {
        const wcagResult = await runWcagAnalysis(page, {
          standard: options.wcag.standard,
          nextId
        });
        wcagReport = wcagResult.wcagReport;
        findings.push(...wcagResult.findings);
      } catch (err) {
        console.warn(`[SEGA] Avertissement: le module WCAG a rencontré une erreur:`, err);
      }
    } else {
      try {
        const axeResults = await new AxeBuilder({ page }).analyze();
        for (const violation of axeResults.violations) {
          if (violation.id === 'color-contrast') {
            const selector = violation.nodes[0]?.target.join(' ');
            findings.push({
              id: nextId(),
              axis: 'axis-1',
              bastienScapinRule: '1.4 Lisibilité',
              nielsenRule: '#8 Design esthétique et minimaliste',
              title: 'Défaut de contraste typographique (non-conformité WCAG)',
              location: selector || 'Éléments textuels variés',
              selector,
              severity: 2,
              effort: 'Faible',
              isQuickWin: true,
              observation: `Ratio de contraste insuffisant sur ${violation.nodes.length} élément(s).`,
              expectedBehavior: 'Ajuster les teintes du design system pour atteindre au moins 4.5:1 sur texte standard et 3:1 sur les titres.',
              codeSnippetBefore: 'color: #94a3b8; /* Contraste trop faible sur fond blanc */',
              codeSnippetAfter: 'color: #475569; /* Contraste conforme WCAG AA (≥ 4.5:1) */'
            });
          } else if (violation.id === 'label') {
            const selector = violation.nodes[0]?.target.join(' ');
            findings.push({
              id: nextId(),
              axis: 'axis-1',
              bastienScapinRule: '1.1 Incitation',
              nielsenRule: '#1 Visibilité de l état du système',
              title: 'Champs de formulaire sans étiquette (<label>) explicite',
              location: selector || 'Champs input',
              selector,
              severity: 3,
              effort: 'Faible',
              isQuickWin: true,
              observation: 'Des champs de saisie ne possèdent pas de balise <label> ni d attribut aria-label.',
              expectedBehavior: 'Chaque champ doit disposer d un <label htmlFor="..."> visible et explicitement associé.',
              codeSnippetBefore: '<input type="text" placeholder="Entrez votre nom" />',
              codeSnippetAfter: '<label htmlFor="userName">Votre nom</label>\n<input id="userName" type="text" />'
            });
          } else if (violation.id === 'button-name') {
            const selector = violation.nodes[0]?.target.join(' ');
            findings.push({
              id: nextId(),
              axis: 'axis-8',
              bastienScapinRule: '8.0 Compatibilité',
              nielsenRule: '#6 Reconnaissance plutôt que rappel',
              title: 'Boutons interactifs dépourvus de texte accessible',
              location: selector || 'Boutons icônes',
              selector,
              severity: 3,
              effort: 'Faible',
              isQuickWin: true,
              observation: 'Des boutons (notamment des boutons-icônes) ne disposent d aucun nom accessible pour les technologies d assistance.',
              expectedBehavior: 'Ajouter un aria-label ou un texte visuellement masqué (sr-only).',
              codeSnippetBefore: '<button><svg ...></svg></button>',
              codeSnippetAfter: '<button aria-label="Fermer le dialogue"><svg ...></svg></button>'
            });
          }
        }
      } catch {
        // Axe run handled
      }
    }

    // 3. Inspection interactive du DOM
    const domIssues = await page.evaluate(() => {
      const issues: Array<{ rule: string; selector: string; desc: string }> = [];

      // Clickable divs without role or keyboard access
      const fakeButtons = document.querySelectorAll('div[onclick], span[onclick]');
      fakeButtons.forEach((el, index) => {
        if (index < 3 && !el.getAttribute('role') && !el.getAttribute('tabindex')) {
          issues.push({
            rule: 'affordance',
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
            desc: 'Élément cliquable simulé par un <div> ou <span> sans role="button" ni tabindex="0"'
          });
        }
      });

      // Modals without escape key listener hint or aria-modal
      const openDialogs = document.querySelectorAll('dialog, [role="dialog"]');
      openDialogs.forEach((dialog) => {
        if (!dialog.getAttribute('aria-modal')) {
          issues.push({
            rule: 'modal-freedom',
            selector: 'dialog[role="dialog"]',
            desc: 'Dialogue sans aria-modal="true" risquant de piéger le focus'
          });
        }
      });

      return issues;
    });

    for (const issue of domIssues) {
      if (issue.rule === 'affordance') {
        findings.push({
          id: nextId(),
          axis: 'axis-8',
          bastienScapinRule: '8.0 Compatibilité',
          nielsenRule: '#6 Reconnaissance plutôt que rappel',
          title: "Éléments cliquables dépourvus d'affordance native et d'accès clavier",
          location: issue.selector,
          selector: issue.selector,
          severity: 3,
          effort: 'Faible',
          isQuickWin: true,
          observation: issue.desc,
          expectedBehavior: "Remplacer l'élément générique par une balise native <button> ou renseigner role='button' et tabindex='0'.",
          codeSnippetBefore: `<div onClick={handleClick}>Action</div>`,
          codeSnippetAfter: `<button type="button" onClick={handleClick}>Action</button>`
        });
      }
    }

    // 3.5. Génération des marqueurs visuels et capture annotée (Desktop)
    try {
      const annotationResult = await annotateAndCaptureScreenshots(page, findings, screenshotsDir, 'desktop');
      desktopAnnotated = annotationResult.annotatedScreenshotPath;
      desktopSnippets = annotationResult.snippets;
    } catch (annotationErr) {
      console.warn(`[SEGA] Avertissement: la génération des marqueurs visuels a échoué:`, annotationErr);
    }

    await context.close();

    // 4. Mobile inspection (375x812)
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await mobilePage.waitForTimeout(2000);
    const savedMobile = await captureAndSaveScreenshot(mobilePage, mobileScreenshot, { fullPage: false });
    mobileScreenshot = savedMobile.fullPath;

    // Check horizontal overflow
    const hasHorizontalOverflow = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    if (hasHorizontalOverflow) {
      findings.push({
        id: nextId(),
        axis: 'axis-4',
        bastienScapinRule: '4.1 Flexibilité',
        nielsenRule: '#7 Flexibilité et efficience d usage',
        title: 'Défilement horizontal involontaire en résolution mobile',
        location: 'Viewport mobile 375px',
        severity: 3,
        effort: 'Faible',
        isQuickWin: true,
        observation: 'La page déborde de la largeur de l écran sur mobile, provoquant un scroll horizontal parasite.',
        expectedBehavior: 'Corriger les largeurs fixes en pixels et appliquer un conteneur responsive avec `max-width: 100%` et `overflow-x: hidden`.',
        codeSnippetBefore: 'width: 1200px; /* Largeur fixe cassant le mobile */',
        codeSnippetAfter: 'width: 100%;\nmax-width: 1200px;\nbox-sizing: border-box;'
      });
    }

    await mobileContext.close();

    // 5. Analyse Qualitative & Cognitive par IA (Multimodale)
    if (options.ai?.enabled) {
      try {
        const knownIssues = findings.map((f) => `[${f.axis}] ${f.title} (${f.observation})`);
        aiAnalysisResult = await runAiErgonomicAnalysis({
          config: options.ai,
          request: {
            url: targetUrl,
            pageTitle,
            desktopScreenshotPath: desktopScreenshot,
            mobileScreenshotPath: mobileScreenshot,
            domSummary,
            scriptFindingsCount: findings.length,
            knownIssuesSummary: knownIssues
          },
          nextFindingId: nextId
        });

        if (aiAnalysisResult && aiAnalysisResult.findings.length > 0) {
          findings.push(...aiAnalysisResult.findings);
        }
      } catch (aiErr) {
        console.warn(`[SEGA] Erreur non bloquante lors de l'analyse IA :`, aiErr);
      }
    }
  } finally {
    await browser.close();
  }

  return {
    findings,
    screenshots: {
      desktop: desktopScreenshot,
      mobile: mobileScreenshot,
      desktopAnnotated,
      annotatedSnippets: desktopSnippets
    },
    wcag: wcagReport,
    aiAnalysis: aiAnalysisResult
  };
}
