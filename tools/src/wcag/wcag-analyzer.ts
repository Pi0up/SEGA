import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {
  Finding,
  WcagReportData,
  WcagViolation,
  WcagPrinciple,
  UnifiedAxisId,
  NielsenSeverity,
  EffortLevel
} from '../types';

export interface WcagAnalyzerOptions {
  standard?: string;
  nextId?: () => string;
}

export interface WcagAnalysisResult {
  wcagReport: WcagReportData;
  findings: Finding[];
}

/**
 * Résout les tags axe-core correspondants au niveau de standard WCAG demandé
 */
export function resolveWcagTags(standardInput?: string): { standard: string; tags: string[] } {
  const norm = (standardInput || '2.1AA').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (norm.includes('22') || norm === '22aa') {
    return {
      standard: 'WCAG 2.2 AA',
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
    };
  }

  if (norm.includes('aaa')) {
    return {
      standard: 'WCAG 2.1 AAA',
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag2aaa']
    };
  }

  if (norm === '20a' || norm === 'a') {
    return {
      standard: 'WCAG 2.0 A',
      tags: ['wcag2a']
    };
  }

  if (norm === '20aa') {
    return {
      standard: 'WCAG 2.0 AA',
      tags: ['wcag2a', 'wcag2aa']
    };
  }

  if (norm === '21a') {
    return {
      standard: 'WCAG 2.1 A',
      tags: ['wcag2a', 'wcag21a']
    };
  }

  // Par défaut : WCAG 2.1 AA
  return {
    standard: 'WCAG 2.1 AA',
    tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
  };
}

/**
 * Détermine le principe WCAG (Perceptible, Utilisable, Compréhensible, Robuste)
 */
export function determineWcagPrinciple(tags: string[], ruleId: string): WcagPrinciple {
  const wcagTag = tags.find((t) => /^wcag\d{3}$/i.test(t));
  if (wcagTag) {
    const digit = wcagTag.charAt(4);
    if (digit === '1') return 'Perceptible';
    if (digit === '2') return 'Utilisable';
    if (digit === '3') return 'Compréhensible';
    if (digit === '4') return 'Robuste';
  }

  // Déduction par tags de catégorie axe-core ou nom de règle
  if (tags.some((t) => t.includes('color') || t.includes('text-alternatives') || t.includes('sensory-and-visual-cues'))) {
    return 'Perceptible';
  }
  if (tags.some((t) => t.includes('keyboard') || t.includes('time-and-media') || t.includes('navigation'))) {
    return 'Utilisable';
  }
  if (tags.some((t) => t.includes('language') || t.includes('forms') || t.includes('readability'))) {
    return 'Compréhensible';
  }
  if (tags.some((t) => t.includes('aria') || t.includes('parsing') || t.includes('name-role-value'))) {
    return 'Robuste';
  }

  if (['color-contrast', 'image-alt'].includes(ruleId)) return 'Perceptible';
  if (['button-name', 'aria-roles', 'aria-valid-attr'].includes(ruleId)) return 'Robuste';
  if (['label', 'form-field-multiple-labels'].includes(ruleId)) return 'Compréhensible';

  return 'Perceptible';
}

/**
 * Mappe une violation WCAG / axe-core vers le méta-axe SEGA, Bastien & Scapin et Nielsen
 */
export function mapWcagToErgonomicAxis(ruleId: string, principle: WcagPrinciple): {
  axis: UnifiedAxisId;
  bastienScapinRule: string;
  nielsenRule: string;
} {
  switch (ruleId) {
    case 'color-contrast':
      return {
        axis: 'axis-1',
        bastienScapinRule: '1.4 Lisibilité',
        nielsenRule: '#8 Design esthétique et minimaliste'
      };
    case 'image-alt':
      return {
        axis: 'axis-1',
        bastienScapinRule: '1.1 Incitation',
        nielsenRule: '#1 Visibilité de l état du système'
      };
    case 'label':
    case 'aria-input-field-name':
      return {
        axis: 'axis-1',
        bastienScapinRule: '1.1 Incitation',
        nielsenRule: '#1 Visibilité de l état du système'
      };
    case 'button-name':
    case 'link-name':
      return {
        axis: 'axis-8',
        bastienScapinRule: '8.0 Compatibilité',
        nielsenRule: '#6 Reconnaissance plutôt que rappel'
      };
    case 'tabindex':
    case 'focus-order-semantics':
      return {
        axis: 'axis-4',
        bastienScapinRule: '4.1 Flexibilité',
        nielsenRule: '#7 Flexibilité et efficience d usage'
      };
    case 'html-has-lang':
    case 'document-title':
      return {
        axis: 'axis-6',
        bastienScapinRule: '6.0 Homogénéité et Cohérence',
        nielsenRule: '#4 Cohérence et standards'
      };
    case 'aria-required-children':
    case 'aria-required-parent':
    case 'aria-roles':
    case 'aria-valid-attr':
      return {
        axis: 'axis-8',
        bastienScapinRule: '8.0 Compatibilité',
        nielsenRule: '#6 Reconnaissance plutôt que rappel'
      };
    default:
      if (principle === 'Perceptible') {
        return {
          axis: 'axis-1',
          bastienScapinRule: '1.4 Lisibilité',
          nielsenRule: '#8 Design esthétique et minimaliste'
        };
      }
      if (principle === 'Utilisable') {
        return {
          axis: 'axis-4',
          bastienScapinRule: '4.1 Flexibilité',
          nielsenRule: '#7 Flexibilité et efficience d usage'
        };
      }
      if (principle === 'Compréhensible') {
        return {
          axis: 'axis-5',
          bastienScapinRule: '5.1 Protection contre les erreurs',
          nielsenRule: '#5 Prévention des erreurs'
        };
      }
      return {
        axis: 'axis-8',
        bastienScapinRule: '8.0 Compatibilité',
        nielsenRule: '#6 Reconnaissance plutôt que rappel'
      };
  }
}

/**
 * Traduit l'impact axe-core en sévérité Nielsen (0-4) et effort
 */
export function mapImpactToSeverityAndEffort(impact?: string | null): {
  severity: NielsenSeverity;
  effort: EffortLevel;
  isQuickWin: boolean;
} {
  switch (impact) {
    case 'critical':
      return { severity: 4, effort: 'Moyen', isQuickWin: false };
    case 'serious':
      return { severity: 3, effort: 'Faible', isQuickWin: true };
    case 'moderate':
      return { severity: 2, effort: 'Faible', isQuickWin: true };
    case 'minor':
    default:
      return { severity: 1, effort: 'Faible', isQuickWin: false };
  }
}

/**
 * Génère un diff prescriptif avant / après adapté à la règle WCAG enfreinte
 */
export function generatePrescriptiveCodeDiff(ruleId: string, nodeHtml?: string): { before?: string; after?: string } {
  const sampleHtml = nodeHtml || '';

  switch (ruleId) {
    case 'color-contrast':
      return {
        before: sampleHtml || 'color: #94a3b8; /* Ratio de contraste < 4.5:1 sur fond clair */',
        after: 'color: #475569; /* Conforme WCAG AA (ratio >= 4.5:1) */'
      };
    case 'image-alt':
      return {
        before: sampleHtml || '<img src="illustration.png" />',
        after: '<img src="illustration.png" alt="Description textuelle explicite" />'
      };
    case 'button-name':
      return {
        before: sampleHtml || '<button><svg ...></svg></button>',
        after: '<button aria-label="Action explicite"><svg ...></svg></button>'
      };
    case 'link-name':
      return {
        before: sampleHtml || '<a href="/details">En savoir plus</a>',
        after: '<a href="/details" aria-label="En savoir plus sur nos offres">En savoir plus</a>'
      };
    case 'label':
      return {
        before: sampleHtml || '<input type="text" placeholder="Entrez votre nom" />',
        after: '<label htmlFor="userId">Votre nom</label>\n<input id="userId" type="text" />'
      };
    case 'html-has-lang':
      return {
        before: '<html>',
        after: '<html lang="fr">'
      };
    case 'document-title':
      return {
        before: '<head>\n  <!-- Pas de balise <title> -->\n</head>',
        after: '<head>\n  <title>Tableau de bord - Mon Application</title>\n</head>'
      };
    case 'tabindex':
      return {
        before: sampleHtml || '<div tabindex="3">Élément</div>',
        after: '<div tabindex="0">Élément navigable dans l ordre naturel</div>'
      };
    default:
      if (sampleHtml) {
        return {
          before: sampleHtml.length > 120 ? sampleHtml.substring(0, 120) + '...' : sampleHtml,
          after: '<!-- Corriger la conformité selon les recommandations d accessibilité WCAG -->'
        };
      }
      return {};
  }
}

/**
 * Exécute l'audit complet WCAG sur la page active Playwright
 */
export async function runWcagAnalysis(page: Page, options: WcagAnalyzerOptions = {}): Promise<WcagAnalysisResult> {
  const { standard, tags } = resolveWcagTags(options.standard);
  const nextId = options.nextId || (() => `SPEC-${Math.floor(Math.random() * 1000).toString().padStart(2, '0')}`);

  let axeResults;
  try {
    axeResults = await new AxeBuilder({ page }).withTags(tags).analyze();
  } catch (err) {
    throw new Error(`Échec de l'exécution de la sonde d'accessibilité WCAG axe-core : ${err instanceof Error ? err.message : String(err)}`);
  }

  const violations: WcagViolation[] = [];
  const findings: Finding[] = [];

  const byPrinciple = {
    perceivable: 0,
    operable: 0,
    understandable: 0,
    robust: 0
  };

  const byImpact = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };

  for (const v of axeResults.violations) {
    const rawImpact = (v.impact || 'minor') as 'critical' | 'serious' | 'moderate' | 'minor';
    const principle = determineWcagPrinciple(v.tags, v.id);

    // Comptabilisation
    if (principle === 'Perceptible') byPrinciple.perceivable++;
    else if (principle === 'Utilisable') byPrinciple.operable++;
    else if (principle === 'Compréhensible') byPrinciple.understandable++;
    else if (principle === 'Robuste') byPrinciple.robust++;

    if (rawImpact === 'critical') byImpact.critical++;
    else if (rawImpact === 'serious') byImpact.serious++;
    else if (rawImpact === 'moderate') byImpact.moderate++;
    else byImpact.minor++;

    const criteriaTags = v.tags.filter((t) => /^wcag\d+/i.test(t));
    const primaryWcagTag = criteriaTags[0] ? criteriaTags[0].toUpperCase() : standard;

    const violationNodes = v.nodes.map((n) => ({
      target: n.target.join(' '),
      html: n.html,
      failureSummary: n.failureSummary
    }));

    violations.push({
      id: v.id,
      impact: rawImpact,
      wcagCriteria: criteriaTags,
      wcagPrinciple: principle,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodesCount: v.nodes.length,
      nodes: violationNodes
    });

    // Conversion en Finding SEGA
    const { axis, bastienScapinRule, nielsenRule } = mapWcagToErgonomicAxis(v.id, principle);
    const { severity, effort, isQuickWin } = mapImpactToSeverityAndEffort(v.impact);
    const diff = generatePrescriptiveCodeDiff(v.id, violationNodes[0]?.html);

    findings.push({
      id: nextId(),
      axis,
      bastienScapinRule,
      nielsenRule,
      title: `[WCAG ${primaryWcagTag}] ${v.help}`,
      location: violationNodes[0]?.target || 'Éléments DOM multiples',
      severity,
      effort,
      isQuickWin,
      observation: `${v.nodes.length} élément(s) non conforme(s) à la règle WCAG "${v.id}" : ${v.description}`,
      expectedBehavior: `Rendre l'élément pleinement accessible conformément à ${standard} (${v.helpUrl}).`,
      codeSnippetBefore: diff.before,
      codeSnippetAfter: diff.after,
      wcagCriterion: primaryWcagTag
    });
  }

  const passesCount = axeResults.passes.length;
  const violationsCount = axeResults.violations.length;
  const incompleteCount = axeResults.incomplete.length;
  const testedRulesCount = passesCount + violationsCount + incompleteCount;

  const totalEvaluated = passesCount + violationsCount;
  const complianceRate = totalEvaluated > 0 ? Math.round((passesCount / totalEvaluated) * 100) : 100;

  const wcagReport: WcagReportData = {
    enabled: true,
    standard,
    testedRulesCount,
    passesCount,
    violationsCount,
    incompleteCount,
    complianceRate,
    violations,
    byPrinciple,
    byImpact
  };

  return {
    wcagReport,
    findings
  };
}
