import { AuditReportData, Finding, UNIFIED_AXES } from '../types';

export function calculateSegaScore(findings: Finding[]): {
  score: number;
  catastrophes: number;
  majors: number;
  minors: number;
  cosmetics: number;
  quickWins: number;
} {
  let catastrophes = 0;
  let majors = 0;
  let minors = 0;
  let cosmetics = 0;
  let quickWins = 0;

  for (const f of findings) {
    if (f.severity === 4) catastrophes++;
    else if (f.severity === 3) majors++;
    else if (f.severity === 2) minors++;
    else if (f.severity === 1) cosmetics++;

    if (f.isQuickWin) quickWins++;
  }

  const penalty = catastrophes * 15 + majors * 7 + minors * 2 + cosmetics * 0.5;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    catastrophes,
    majors,
    minors,
    cosmetics,
    quickWins
  };
}

export function buildMarkdownReport(data: AuditReportData): string {
  const lines: string[] = [];

  lines.push(`# Rapport d'Audit Ergonomique Expert`);
  lines.push(`**Cible :** \`${data.target}\`  `);
  lines.push(`**Date :** ${data.date}  `);
  lines.push(`**Méthodologie :** Grille Heuristique Unifiée (Bastien & Scapin × Nielsen)  `);
  lines.push(`\n---\n`);

  // Section 1 : Score & Synthèse
  lines.push(`## 1. Synthèse Exécutive & Score Ergonomique (SEGA)`);
  lines.push(``);
  lines.push(`| Indicateur | Valeur | Appréciation |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **Score Global SEGA** | **${data.segaScore} / 100** | ${getScoreBadge(data.segaScore)} |`);
  if (data.wcag) {
    const wcagAppreciation =
      data.wcag.complianceRate >= 90
        ? '🟢 Très bon niveau de conformité'
        : data.wcag.complianceRate >= 75
        ? '🟡 Frictions d accessibilité détectées'
        : '🔴 Risque de non-conformité majeure';
    lines.push(`| **Conformité ${data.wcag.standard}** | **${data.wcag.complianceRate}%** | ${wcagAppreciation} |`);
  }
  lines.push(`| Total Problèmes Détectés | **${data.metrics.totalFindings}** | - |`);
  lines.push(`| Catastrophes d'Utilisabilité (Sévérité 4) | **${data.metrics.catastrophes}** | 🚨 Blocage critique |`);
  lines.push(`| Problèmes Majeurs (Sévérité 3) | **${data.metrics.majors}** | ⚠️ Gêne importante |`);
  lines.push(`| Problèmes Mineurs (Sévérité 2) | **${data.metrics.minors}** | 💡 Amélioration continue |`);
  lines.push(`| Imperfections Cosmétiques (Sévérité 1) | **${data.metrics.cosmetics}** | 🎨 Polissage |`);
  lines.push(`| **Quick-Wins Identifiés** | **${data.metrics.quickWins}** | ⚡ Gain immédiat à faible effort |`);
  lines.push(``);

  // Section 2 : Répartition par Méta-Axe
  lines.push(`## 2. Répartition par Méta-Axe Ergonomique`);
  lines.push(``);
  lines.push(`| Axe Ergonomique Unifié | Nb Constats | Statut |`);
  lines.push(`| :--- | :---: | :--- |`);

  for (const [axisId, axisInfo] of Object.entries(UNIFIED_AXES)) {
    const count = data.findings.filter((f) => f.axis === axisId).length;
    const status = count === 0 ? '✅ Conforme' : count > 2 ? '⚠️ Attention requise' : '🔍 Points à corriger';
    lines.push(`| **${axisInfo.title}** | ${count} | ${status} |`);
  }
  lines.push(``);

  // Section 3 : Fiches de Spécifications UX/UI Prescriptives
  lines.push(`## 3. Fiches de Spécifications UX/UI Prescriptives`);
  lines.push(``);
  lines.push(`> Ces fiches décrivent le comportement cible attendu, la micro-copie corrigée et le diff de code prêt pour l'équipe technique.`);
  lines.push(``);

  for (const f of data.findings) {
    const axisInfo = UNIFIED_AXES[f.axis];
    lines.push(`### [${f.id}] [${axisInfo.title}] ${f.title}`);
    lines.push(``);
    lines.push(`| Propriété | Détail |`);
    lines.push(`| :--- | :--- |`);
    lines.push(`| **Localisation** | \`${f.location}\` |`);
    lines.push(`| **Heuristique Bastien & Scapin** | ${f.bastienScapinRule} |`);
    lines.push(`| **Heuristique Nielsen** | ${f.nielsenRule} |`);
    if (f.wcagCriterion) {
      lines.push(`| **Critère WCAG** | \`${f.wcagCriterion}\` |`);
    }
    lines.push(`| **Sévérité** | **${f.severity} / 4** (${getSeverityLabel(f.severity)}) |`);
    lines.push(`| **Effort de correction** | ${f.effort} |`);
    lines.push(`| **Priorisation** | ${f.isQuickWin ? '⚡ **Quick-Win**' : '🛠️ **Chantier standard**'} |`);
    lines.push(``);
    lines.push(`#### Constat & Impact`);
    lines.push(`- **Observation :** ${f.observation}`);
    lines.push(``);
    lines.push(`#### Spécification Cible`);
    lines.push(`- **Comportement attendu :** ${f.expectedBehavior}`);

    if (f.microCopyBefore || f.microCopyAfter) {
      lines.push(``);
      lines.push(`**Micro-Copie :**`);
      if (f.microCopyBefore) lines.push(`- *Actuel :* \`${f.microCopyBefore}\``);
      if (f.microCopyAfter) lines.push(`- *Cible :* **\`${f.microCopyAfter}\`**`);
    }

    if (f.codeSnippetBefore || f.codeSnippetAfter) {
      lines.push(``);
      lines.push(`**Proposition de code (Diff) :**`);
      lines.push(`\`\`\`diff`);
      if (f.codeSnippetBefore) {
        f.codeSnippetBefore.split('\n').forEach((l) => lines.push(`- ${l}`));
      }
      if (f.codeSnippetAfter) {
        f.codeSnippetAfter.split('\n').forEach((l) => lines.push(`+ ${l}`));
      }
      lines.push(`\`\`\``);
    }

    lines.push(`\n---\n`);
  }

  // Section 4 : Audit de Conformité Accessibilité Numérique (WCAG)
  if (data.wcag) {
    lines.push(`## 4. Audit de Conformité Accessibilité Numérique (${data.wcag.standard})`);
    lines.push(``);
    lines.push(`| Indicateur WCAG | Valeur |`);
    lines.push(`| :--- | :---: |`);
    lines.push(`| **Standard évalué** | ${data.wcag.standard} |`);
    lines.push(`| **Taux de conformité global** | **${data.wcag.complianceRate}%** |`);
    lines.push(`| Règles testées avec succès (Passes) | ${data.wcag.passesCount} |`);
    lines.push(`| Règles en violation (Violations) | ${data.wcag.violationsCount} |`);
    lines.push(`| Tests nécessitant validation manuelle (Incomplete) | ${data.wcag.incompleteCount} |`);
    lines.push(``);

    lines.push(`### Répartition par Principes WCAG`);
    lines.push(``);
    lines.push(`| Principe WCAG | Non-conformités | Description |`);
    lines.push(`| :--- | :---: | :--- |`);
    lines.push(`| **1. Perceptible** | ${data.wcag.byPrinciple.perceivable} | Équivalents textuels, contrastes, structure visuelle |`);
    lines.push(`| **2. Utilisable** | ${data.wcag.byPrinciple.operable} | Clavier, temps suffisant, navigation, cibles tactiles |`);
    lines.push(`| **3. Compréhensible** | ${data.wcag.byPrinciple.understandable} | Lisibilité du texte, prévisibilité, aide à la saisie |`);
    lines.push(`| **4. Robuste** | ${data.wcag.byPrinciple.robust} | Compatibilité technologies d'assistance, balises ARIA |`);
    lines.push(``);

    lines.push(`### Répartition des Violations par Impact`);
    lines.push(``);
    lines.push(`| Niveau d'impact | Nombre | Priorité de remédiation |`);
    lines.push(`| :--- | :---: | :--- |`);
    lines.push(`| 🚨 Critique | ${data.wcag.byImpact.critical} | Bloquant pour les utilisateurs handicapés |`);
    lines.push(`| ⚠️ Sérieux | ${data.wcag.byImpact.serious} | Gêne majeure d'accessibilité |`);
    lines.push(`| 💡 Modéré | ${data.wcag.byImpact.moderate} | Manquement aux recommandations |`);
    lines.push(`| ℹ️ Mineur | ${data.wcag.byImpact.minor} | Ajustement de confort |`);
    lines.push(``);

    if (data.wcag.violations.length > 0) {
      lines.push(`### Inventaire Détaillé des Violations WCAG`);
      lines.push(``);
      lines.push(`| Règle / Critère | Principe | Impact | Éléments impactés | Aide & Référence |`);
      lines.push(`| :--- | :--- | :--- | :---: | :--- |`);

      for (const v of data.wcag.violations) {
        const criteriaLabel = v.wcagCriteria.length > 0 ? v.wcagCriteria.join(', ').toUpperCase() : '-';
        lines.push(
          `| **\`${v.id}\`** (${criteriaLabel}) | ${v.wcagPrinciple} | ${getImpactBadge(v.impact)} | ${v.nodesCount} | [${v.help}](${v.helpUrl}) |`
        );
      }
      lines.push(``);
    }
  }

  return lines.join('\n');
}

function getImpactBadge(impact: string): string {
  switch (impact) {
    case 'critical':
      return '🚨 Critique';
    case 'serious':
      return '⚠️ Sérieux';
    case 'moderate':
      return '💡 Modéré';
    case 'minor':
    default:
      return 'ℹ️ Mineur';
  }
}

function getScoreBadge(score: number): string {
  if (score >= 85) return '🟢 Excellent niveau ergonomique';
  if (score >= 70) return '🟡 Bon niveau avec frictions ciblées';
  if (score >= 50) return '🟠 Frictions ergonomiques notables';
  return '🔴 Risque élevé de rejet ou abandon utilisateur';
}

function getSeverityLabel(severity: number): string {
  switch (severity) {
    case 4:
      return 'Catastrophe d utilisabilité';
    case 3:
      return 'Majeur';
    case 2:
      return 'Mineur';
    case 1:
      return 'Cosmétique';
    default:
      return 'Informatif';
  }
}
