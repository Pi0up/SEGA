import { describe, it, expect } from 'vitest';
import { buildMarkdownReport } from '../src/reporter/markdown-builder';
import { AuditReportData } from '../src/types';

describe('Markdown Report Builder', () => {
  it('generates a complete structured markdown report', () => {
    const reportData: AuditReportData = {
      target: 'https://example.com/checkout',
      date: '2026-11-10',
      segaScore: 82,
      metrics: {
        totalFindings: 2,
        catastrophes: 0,
        majors: 1,
        minors: 1,
        cosmetics: 0,
        quickWins: 2
      },
      findings: [
        {
          id: 'SPEC-01',
          axis: 'axis-1',
          bastienScapinRule: '1.4 Lisibilité',
          nielsenRule: '#8 Design esthétique et minimaliste',
          title: 'Défaut de contraste sur les mentions légales',
          location: '.legal-text',
          severity: 2,
          effort: 'Faible',
          isQuickWin: true,
          observation: 'Contraste mesuré à 2.8:1 sur fond gris',
          expectedBehavior: 'Porter le contraste à au moins 4.5:1',
          microCopyBefore: 'Mentions gris clair',
          microCopyAfter: 'Mentions gris foncé lisible',
          codeSnippetBefore: 'color: #94a3b8;',
          codeSnippetAfter: 'color: #334155;'
        },
        {
          id: 'SPEC-02',
          axis: 'axis-8',
          bastienScapinRule: '8.0 Compatibilité',
          nielsenRule: '#6 Reconnaissance plutôt que rappel',
          title: 'Bouton icône dépourvu de nom accessible',
          location: 'button.icon-close',
          severity: 3,
          effort: 'Faible',
          isQuickWin: true,
          observation: 'Pas d attribut aria-label sur le bouton de fermeture',
          expectedBehavior: 'Ajouter aria-label="Fermer"',
          codeSnippetBefore: '<button><svg ...></svg></button>',
          codeSnippetAfter: '<button aria-label="Fermer"><svg ...></svg></button>'
        }
      ],
      wcag: {
        standard: 'WCAG 2.1 AA',
        complianceRate: 88,
        passesCount: 45,
        violationsCount: 3,
        incompleteCount: 1,
        byPrinciple: {
          perceivable: 1,
          operable: 0,
          understandable: 1,
          robust: 1
        },
        byImpact: {
          critical: 0,
          serious: 1,
          moderate: 1,
          minor: 1
        },
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            wcagCriteria: ['wcag143'],
            wcagPrinciple: 'Perceptible',
            description: 'Ensure contrast ratio meets minimum',
            help: 'Elements must meet minimum color contrast ratio thresholds',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
            nodesCount: 1,
            nodes: [
              {
                target: '.legal-text',
                html: '<span class="legal-text">Conditions</span>'
              }
            ]
          }
        ]
      }
    };

    const markdown = buildMarkdownReport(reportData);

    expect(markdown).toContain('# Rapport d\'Audit Ergonomique Expert');
    expect(markdown).toContain('https://example.com/checkout');
    expect(markdown).toContain('82 / 100');
    expect(markdown).toContain('## 1. Synthèse Exécutive & Score Ergonomique (SEGA)');
    expect(markdown).toContain('## 2. Répartition par Méta-Axe Ergonomique');
    expect(markdown).toContain('## 3. Fiches de Spécifications UX/UI Prescriptives');
    expect(markdown).toContain('## 4. Audit de Conformité Accessibilité Numérique (WCAG 2.1 AA)');
    expect(markdown).toContain('[SPEC-01]');
    expect(markdown).toContain('[SPEC-02]');
    expect(markdown).toContain('color: #334155;');
    expect(markdown).toContain('### Inventaire Détaillé des Violations WCAG');
    expect(markdown).toContain('color-contrast');
  });

  it('renders correctly when no WCAG data is provided', () => {
    const reportData: AuditReportData = {
      target: 'local-file.tsx',
      date: '2026-11-10',
      segaScore: 100,
      metrics: {
        totalFindings: 0,
        catastrophes: 0,
        majors: 0,
        minors: 0,
        cosmetics: 0,
        quickWins: 0
      },
      findings: []
    };

    const markdown = buildMarkdownReport(reportData);

    expect(markdown).toContain('100 / 100');
    expect(markdown).not.toContain('## 4. Audit de Conformité Accessibilité Numérique');
  });
});
