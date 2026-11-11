import { Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';
import * as fs from 'fs';
import { Finding, WcagReportData } from '../types';
import { runWcagAnalysis } from '../wcag';
import { extractLinksFromPage } from './link-extractor';

export interface PageAuditOptions {
  url: string;
  startOrigin: string;
  pageIndex: number;
  outputDir: string;
  wcag?: {
    enabled: boolean;
    standard?: string;
  };
  crawlOptions?: {
    sameOrigin?: boolean;
    allowedPatterns?: string[];
    disallowedPatterns?: string[];
  };
  nextId: () => string;
}

export interface SinglePageAuditResult {
  url: string;
  path: string;
  title: string;
  status: number;
  durationMs: number;
  findings: Finding[];
  screenshots: {
    desktop: string;
    mobile: string;
  };
  wcag?: WcagReportData;
  discoveredLinks: string[];
}

function sanitizeSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.substring(0, 40) || 'root';
}

export async function auditSinglePage(
  browser: Browser,
  options: PageAuditOptions
): Promise<SinglePageAuditResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];
  const screenshotsDir = path.join(options.outputDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const urlObj = new URL(options.url);
  const pathname = urlObj.pathname || '/';
  const lastSegment = pathname.split('/').filter(Boolean).pop() || 'home';
  const pageSlug = sanitizeSlug(lastSegment);

  const desktopScreenshot = path.join(
    screenshotsDir,
    `screenshot-p${options.pageIndex}-${pageSlug}-desktop.png`
  );
  const mobileScreenshot = path.join(
    screenshotsDir,
    `screenshot-p${options.pageIndex}-${pageSlug}-mobile.png`
  );

  let status = 200;
  let title = '';
  let discoveredLinks: string[] = [];
  let wcagReport: WcagReportData | undefined;

  // 1. Audit Desktop (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  const desktopPage = await desktopContext.newPage();
  const consoleErrors: string[] = [];
  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    const response = await desktopPage.goto(options.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    if (response) {
      status = response.status();
    }
    await desktopPage.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await desktopPage.waitForTimeout(1500);

    title = (await desktopPage.title()) || options.url;
    await desktopPage.screenshot({ path: desktopScreenshot, fullPage: false });

    // Extraction des liens éligibles pour le crawler
    discoveredLinks = await extractLinksFromPage(
      desktopPage,
      options.url,
      options.startOrigin,
      options.crawlOptions
    );

    // Heuristique Axe 5 : Console errors
    if (consoleErrors.length > 0) {
      findings.push({
        id: options.nextId(),
        axis: 'axis-5',
        bastienScapinRule: '5.1 Protection contre les erreurs',
        nielsenRule: '#9 Aider à reconnaître et corriger les erreurs',
        title: 'Erreurs JavaScript console non interceptées en production',
        location: `Console [Page: ${pathname}]`,
        severity: 3,
        effort: 'Moyen',
        isQuickWin: false,
        pageUrl: options.url,
        pageTitle: title,
        observation: `${consoleErrors.length} erreur(s) console non gérée(s) sur ${options.url} : "${consoleErrors[0].substring(0, 100)}..."`,
        expectedBehavior:
          "Intercepter toutes les exceptions et afficher un état de secours (Error Boundary) gracieux pour l'utilisateur.",
        microCopyBefore: 'Aucun message visuel (erreur silencieuse)',
        microCopyAfter: "Une anomalie temporaire est survenue. L'équipe a été prévenue."
      });
    }

    // Heuristique Axe 1 & WCAG : Audit d'accessibilité
    if (options.wcag?.enabled) {
      try {
        const wcagResult = await runWcagAnalysis(desktopPage, {
          standard: options.wcag.standard,
          nextId: options.nextId
        });
        wcagReport = wcagResult.wcagReport;
        for (const f of wcagResult.findings) {
          f.pageUrl = options.url;
          f.pageTitle = title;
          f.location = `${f.location} [Page: ${pathname}]`;
          findings.push(f);
        }
      } catch (err) {
        console.warn(`[SEGA] Avertissement WCAG sur ${options.url}:`, err);
      }
    } else {
      try {
        const axeResults = await new AxeBuilder({ page: desktopPage }).analyze();
        for (const violation of axeResults.violations) {
          if (violation.id === 'color-contrast') {
            findings.push({
              id: options.nextId(),
              axis: 'axis-1',
              bastienScapinRule: '1.4 Lisibilité',
              nielsenRule: '#8 Design esthétique et minimaliste',
              title: 'Défaut de contraste typographique (non-conformité WCAG)',
              location: `${violation.nodes[0]?.target.join(' ') || 'Éléments textuels'} [Page: ${pathname}]`,
              severity: 2,
              effort: 'Faible',
              isQuickWin: true,
              pageUrl: options.url,
              pageTitle: title,
              observation: `Ratio de contraste insuffisant sur ${violation.nodes.length} élément(s).`,
              expectedBehavior:
                'Ajuster les teintes du design system pour atteindre au moins 4.5:1 sur texte standard et 3:1 sur les titres.',
              codeSnippetBefore: 'color: #94a3b8; /* Contraste trop faible sur fond blanc */',
              codeSnippetAfter: 'color: #475569; /* Contraste conforme WCAG AA (≥ 4.5:1) */'
            });
          } else if (violation.id === 'label') {
            findings.push({
              id: options.nextId(),
              axis: 'axis-1',
              bastienScapinRule: '1.1 Incitation',
              nielsenRule: "#1 Visibilité de l'état du système",
              title: 'Champs de formulaire sans étiquette (<label>) explicite',
              location: `${violation.nodes[0]?.target.join(' ') || 'Champs input'} [Page: ${pathname}]`,
              severity: 3,
              effort: 'Faible',
              isQuickWin: true,
              pageUrl: options.url,
              pageTitle: title,
              observation: "Des champs de saisie ne possèdent pas de balise <label> ni d'attribut aria-label.",
              expectedBehavior: 'Chaque champ doit disposer d un <label htmlFor="..."> visible et explicitement associé.',
              codeSnippetBefore: '<input type="text" placeholder="Entrez votre nom" />',
              codeSnippetAfter: '<label htmlFor="userName">Votre nom</label>\n<input id="userName" type="text" />'
            });
          } else if (violation.id === 'button-name') {
            findings.push({
              id: options.nextId(),
              axis: 'axis-8',
              bastienScapinRule: '8.0 Compatibilité',
              nielsenRule: '#6 Reconnaissance plutôt que rappel',
              title: 'Boutons interactifs dépourvus de texte accessible',
              location: `${violation.nodes[0]?.target.join(' ') || 'Boutons'} [Page: ${pathname}]`,
              severity: 3,
              effort: 'Faible',
              isQuickWin: true,
              pageUrl: options.url,
              pageTitle: title,
              observation: "Des boutons ne disposent d'aucun nom accessible pour les technologies d'assistance.",
              expectedBehavior: 'Ajouter un aria-label ou un texte visuellement masqué (sr-only).',
              codeSnippetBefore: '<button><svg ...></svg></button>',
              codeSnippetAfter: '<button aria-label="Fermer le dialogue"><svg ...></svg></button>'
            });
          }
        }
      } catch {
        // Axe scan handled
      }
    }

    // Heuristiques interactives du DOM (Axe 8 Affordance, Axe 3 Dialogue, Axe 1/6 Titres)
    const domInspection = await desktopPage.evaluate(() => {
      const issues: Array<{ rule: string; selector: string; desc: string }> = [];

      // 1. Boutons simulés sans rôle ni tabindex
      const fakeButtons = document.querySelectorAll('div[onclick], span[onclick]');
      fakeButtons.forEach((el, index) => {
        if (index < 3 && !el.getAttribute('role') && !el.getAttribute('tabindex')) {
          issues.push({
            rule: 'affordance',
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
            desc: "Élément cliquable simulé par un <div> ou <span> sans role='button' ni tabindex='0'"
          });
        }
      });

      // 2. Dialogues sans aria-modal
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

      // 3. Hiérarchie des titres h1-h6
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const h1s = headings.filter((h) => h.tagName.toLowerCase() === 'h1');
      if (h1s.length > 1) {
        issues.push({
          rule: 'heading-multiple-h1',
          selector: 'h1',
          desc: `La page contient ${h1s.length} balises <h1> distinctes, altérant la structure du document`
        });
      } else if (h1s.length === 0 && headings.length > 0) {
        issues.push({
          rule: 'heading-missing-h1',
          selector: 'body',
          desc: "La page ne possède aucune balise <h1> principale pour introduire son contenu"
        });
      }

      // Sauts de niveaux dans les titres (ex: h1 suivi de h3 sans h2)
      let prevLevel = 0;
      for (const h of headings) {
        const level = parseInt(h.tagName.substring(1), 10);
        if (prevLevel > 0 && level > prevLevel + 1) {
          issues.push({
            rule: 'heading-skipped-level',
            selector: `<${h.tagName.toLowerCase()}>`,
            desc: `Saut de niveau de titre injustifié : passage d'un <h${prevLevel}> directement à un <h${level}> sans niveau intermédiaire`
          });
          break; // Un signalement par page suffit
        }
        prevLevel = level;
      }

      return issues;
    });

    for (const item of domInspection) {
      if (item.rule === 'affordance') {
        findings.push({
          id: options.nextId(),
          axis: 'axis-8',
          bastienScapinRule: '8.0 Compatibilité',
          nielsenRule: '#6 Reconnaissance plutôt que rappel',
          title: "Éléments cliquables dépourvus d'affordance native et d'accès clavier",
          location: `${item.selector} [Page: ${pathname}]`,
          severity: 3,
          effort: 'Faible',
          isQuickWin: true,
          pageUrl: options.url,
          pageTitle: title,
          observation: item.desc,
          expectedBehavior:
            "Remplacer l'élément générique par une balise native <button> ou renseigner role='button' et tabindex='0'.",
          codeSnippetBefore: `<div onClick={handleClick}>Action</div>`,
          codeSnippetAfter: `<button type="button" onClick={handleClick}>Action</button>`
        });
      } else if (item.rule === 'modal-freedom') {
        findings.push({
          id: options.nextId(),
          axis: 'axis-3',
          bastienScapinRule: '3.2 Contrôle utilisateur',
          nielsenRule: "#3 Contrôle et liberté de l'utilisateur",
          title: 'Dialogue modal sans issue de secours ni piégeage explicite du focus',
          location: `${item.selector} [Page: ${pathname}]`,
          severity: 3,
          effort: 'Faible',
          isQuickWin: true,
          pageUrl: options.url,
          pageTitle: title,
          observation: item.desc,
          expectedBehavior:
            "Définir aria-modal='true', intercepter la touche Échap pour la fermeture et confiner le focus clavier dans la modale.",
          codeSnippetBefore: `<dialog open>\n  <p>Contenu</p>\n</dialog>`,
          codeSnippetAfter: `<dialog open aria-modal="true" onKeyDown={handleEscape}>\n  <p>Contenu</p>\n  <button aria-label="Fermer">✕</button>\n</dialog>`
        });
      } else if (item.rule === 'heading-multiple-h1' || item.rule === 'heading-missing-h1' || item.rule === 'heading-skipped-level') {
        findings.push({
          id: options.nextId(),
          axis: 'axis-1',
          bastienScapinRule: '1.2 Groupement/Distinction',
          nielsenRule: "#1 Visibilité de l'état du système",
          title: 'Défaut de structure hiérarchique des titres (Balises H1-H6)',
          location: `${item.selector} [Page: ${pathname}]`,
          severity: 2,
          effort: 'Faible',
          isQuickWin: true,
          pageUrl: options.url,
          pageTitle: title,
          observation: item.desc,
          expectedBehavior:
            'Structurer la page avec exactement un titre <h1> principal, suivi de sous-sections <h2> et <h3> sans discontinuité.',
          codeSnippetBefore: `<h1>Titre 1</h1>\n<h1>Titre 2</h1> <!-- Titres h1 multiples -->`,
          codeSnippetAfter: `<h1>Titre Unique de la Page</h1>\n<h2>Section A</h2>\n<h3>Sous-section</h3>`
        });
      }
    }
  } finally {
    await desktopContext.close();
  }

  // 2. Audit Mobile (375x812)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto(options.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await mobilePage.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false });

    // Vérification du débordement horizontal
    const mobileMetrics = await mobilePage.evaluate(() => {
      const hasHorizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;

      // Cibles tactiles trop petites (< 24px)
      const interactiveElements = Array.from(document.querySelectorAll('button, a[href], input[type="button"], input[type="submit"]'));
      const smallTargets: string[] = [];

      for (const el of interactiveElements) {
        const rect = el.getBoundingClientRect();
        // Vérifier les éléments visibles uniquement
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 24 || rect.height < 24) {
            const tag = el.tagName.toLowerCase();
            const identifier = el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : tag;
            smallTargets.push(`${identifier} (${Math.round(rect.width)}x${Math.round(rect.height)}px)`);
            if (smallTargets.length >= 3) break;
          }
        }
      }

      return {
        hasHorizontalOverflow,
        smallTargets
      };
    });

    if (mobileMetrics.hasHorizontalOverflow) {
      findings.push({
        id: options.nextId(),
        axis: 'axis-4',
        bastienScapinRule: '4.1 Flexibilité',
        nielsenRule: '#7 Flexibilité et efficience d usage',
        title: 'Défilement horizontal involontaire en résolution mobile',
        location: `Viewport mobile 375px [Page: ${pathname}]`,
        severity: 3,
        effort: 'Faible',
        isQuickWin: true,
        pageUrl: options.url,
        pageTitle: title,
        observation: `La page ${pathname} déborde de la largeur de l écran sur mobile, provoquant un scroll horizontal parasite.`,
        expectedBehavior:
          'Corriger les largeurs fixes en pixels et appliquer un conteneur responsive avec `max-width: 100%` et `overflow-x: hidden`.',
        codeSnippetBefore: 'width: 1200px; /* Largeur fixe cassant le mobile */',
        codeSnippetAfter: 'width: 100%;\nmax-width: 1200px;\nbox-sizing: border-box;'
      });
    }

    if (mobileMetrics.smallTargets.length > 0) {
      findings.push({
        id: options.nextId(),
        axis: 'axis-4',
        bastienScapinRule: '4.1 Flexibilité',
        nielsenRule: '#7 Flexibilité et efficience d usage',
        title: 'Cibles tactiles interactives sous-dimensionnées (< 24px)',
        location: `${mobileMetrics.smallTargets[0]} [Page: ${pathname}]`,
        severity: 2,
        effort: 'Faible',
        isQuickWin: true,
        pageUrl: options.url,
        pageTitle: title,
        observation: `Plusieurs éléments interactifs ont une surface tactile inférieure à 24x24px : ${mobileMetrics.smallTargets.join(', ')}. Risque d'erreur de pointage au doigt.`,
        expectedBehavior:
          'Assurer une zone tactile minimale de 44x44px (ou au moins 24x24px avec espacement adéquat selon WCAG 2.5.8).',
        codeSnippetBefore: 'padding: 2px 4px; /* Zone tactile trop étroite */',
        codeSnippetAfter: 'padding: 10px 14px;\nmin-height: 44px;\nmin-width: 44px;'
      });
    }
  } finally {
    await mobileContext.close();
  }

  const durationMs = Date.now() - startTime;

  return {
    url: options.url,
    path: pathname,
    title,
    status,
    durationMs,
    findings,
    screenshots: {
      desktop: desktopScreenshot,
      mobile: mobileScreenshot
    },
    wcag: wcagReport,
    discoveredLinks
  };
}
