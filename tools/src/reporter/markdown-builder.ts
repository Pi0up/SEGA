import * as path from 'path';
import { AuditReportData, Finding, UNIFIED_AXES } from '../types';

export function calculateSegaScore(findings: Finding[]): {
  score: number;
  technicalScore: number;
  globalScore: number;
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

  let techCatastrophes = 0;
  let techMajors = 0;
  let techMinors = 0;
  let techCosmetics = 0;

  for (const f of findings) {
    if (f.severity === 4) catastrophes++;
    else if (f.severity === 3) majors++;
    else if (f.severity === 2) minors++;
    else if (f.severity === 1) cosmetics++;

    if (f.isQuickWin) quickWins++;

    if (f.source !== 'ai') {
      if (f.severity === 4) techCatastrophes++;
      else if (f.severity === 3) techMajors++;
      else if (f.severity === 2) techMinors++;
      else if (f.severity === 1) techCosmetics++;
    }
  }

  const globalPenalty = catastrophes * 15 + majors * 7 + minors * 2 + cosmetics * 0.5;
  const globalScore = Math.max(0, Math.min(100, Math.round(100 - globalPenalty)));

  const techPenalty = techCatastrophes * 15 + techMajors * 7 + techMinors * 2 + techCosmetics * 0.5;
  const technicalScore = Math.max(0, Math.min(100, Math.round(100 - techPenalty)));

  return {
    score: globalScore,
    technicalScore,
    globalScore,
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

  if (data.aiAnalysis) {
    const globalScore = data.segaScoreGlobal ?? data.segaScore;
    const techScore = data.segaScoreTechnical ?? data.metrics.technicalScore ?? data.segaScore;
    lines.push(`| **Score SEGA Global (Technique + IA)** | **${globalScore} / 100** | ${getScoreBadge(globalScore)} |`);
    lines.push(`| **Score SEGA Technique (Déterministe)** | **${techScore} / 100** | ${getScoreBadge(techScore)} |`);
    lines.push(`| **Analyse IA Qualitative** | **Actif (${data.aiAnalysis.provider.toUpperCase()} / \`${data.aiAnalysis.model}\`)** | 🧠 Regard humain intégré |`);
  } else {
    lines.push(`| **Score Global SEGA** | **${data.segaScore} / 100** | ${getScoreBadge(data.segaScore)} |`);
  }

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

  // Cartographie visuelle des marqueurs
  if (data.screenshots?.desktopAnnotated) {
    const annotatedFilename = path.basename(data.screenshots.desktopAnnotated);
    lines.push(`### 📸 Cartographie Visuelle des Anomalies Détectées`);
    lines.push(``);
    lines.push(
      `La capture d'écran ci-dessous localise précisément sur l'interface les anomalies ergonomiques et d'accessibilité détectées. Chaque défaut est repéré par un cadre de délimitation et une balise numérotée selon son niveau de gravité :`
    );
    lines.push(``);
    lines.push(`![Cartographie visuelle des anomalies](screenshots/${annotatedFilename})`);
    lines.push(``);

    const markedFindings = data.findings.filter((f) => f.visualMarker);
    if (markedFindings.length > 0) {
      lines.push(`| N° Marqueur | Réf. Fiche | Sévérité | Problème Détecté | Localisation DOM |`);
      lines.push(`| :---: | :--- | :---: | :--- | :--- |`);

      for (const f of markedFindings) {
        const marker = f.visualMarker!;
        const badgeEmoji = getSeverityEmoji(f.severity);
        const refAnchor = `#${f.id.toLowerCase()}`;
        lines.push(
          `| ${badgeEmoji} **#${marker.markerNumber}** | [**${f.id}**](${refAnchor}) | ${getSeverityLabel(f.severity)} | ${f.title} | \`${f.location}\` |`
        );
      }
      lines.push(``);
    }
  }

  let sectionIndex = 2;

  // Section Optionnelle : Analyse Qualitative & Psychologie Cognitive (IA)
  if (data.aiAnalysis) {
    const summary = data.aiAnalysis.narrativeSummary;
    lines.push(`## ${sectionIndex++}. Analyse Qualitative & Psychologie Cognitive (IA Human-Centered)`);
    lines.push(``);
    lines.push(
      `> 🧠 **Regard Humain & Ergonomie Cognitive :** Cette évaluation est générée par le modèle vision-langage **${data.aiAnalysis.provider.toUpperCase()}** (\`${data.aiAnalysis.model}\`). Elle aborde les facteurs psychologiques, l'encombrement attentionnel et la tonalité qui échappent aux analyseurs syntaxiques déterministes.`
    );
    lines.push(``);
    lines.push(`### ⚖️ Verdict Global de l'Ergonome IA`);
    lines.push(`${summary.generalVerdict}`);
    lines.push(``);
    lines.push(`### 🔍 Dimensions Heuristiques & Cognitives Évaluées`);
    lines.push(``);
    lines.push(`| Dimension Cognitive | Évaluation Experte |`);
    lines.push(`| :--- | :--- |`);
    lines.push(`| 🧠 **Charge cognitive & Encombrement** | ${summary.cognitiveLoadEvaluation} |`);
    lines.push(`| 💬 **Ton, Clarté & Micro-copie** | ${summary.toneAndMicrocopyEvaluation} |`);
    lines.push(`| 🧭 **Modèles mentaux & Affordance** | ${summary.navigationAndMentalModelsEvaluation} |`);
    lines.push(`| 🎨 **Harmonie visuelle & Sobriété** | ${summary.aestheticAndVisualHarmony} |`);
    lines.push(``);

    if (summary.strengths && summary.strengths.length > 0) {
      lines.push(`### 🏆 Points Forts & Réussites Ergonomiques`);
      summary.strengths.forEach((s: string) => lines.push(`- ✅ ${s}`));
      lines.push(``);
    }
  }

  // Section : Répartition par Méta-Axe
  lines.push(`## ${sectionIndex++}. Répartition par Méta-Axe Ergonomique`);
  lines.push(``);
  lines.push(`| Axe Ergonomique Unifié | Nb Constats | Statut |`);
  lines.push(`| :--- | :---: | :--- |`);

  for (const [axisId, axisInfo] of Object.entries(UNIFIED_AXES)) {
    const count = data.findings.filter((f) => f.axis === axisId).length;
    const status = count === 0 ? '✅ Conforme' : count > 2 ? '⚠️ Attention requise' : '🔍 Points à corriger';
    lines.push(`| **${axisInfo.title}** | ${count} | ${status} |`);
  }
  lines.push(``);

  // Section : Fiches de Spécifications UX/UI Prescriptives
  lines.push(`## ${sectionIndex++}. Fiches de Spécifications UX/UI Prescriptives`);
  lines.push(``);
  lines.push(`> Ces fiches décrivent le comportement cible attendu, la micro-copie corrigée et le diff de code prêt pour l'équipe technique.`);
  lines.push(``);

  for (const f of data.findings) {
    const axisInfo = UNIFIED_AXES[f.axis];
    const sourceBadge = f.source === 'ai' ? '🤖 [IA / Qualitatif]' : '⚙️ [Script / Technique]';
    lines.push(`### [${f.id}] [${axisInfo.title}] ${f.title} ${sourceBadge}`);
    lines.push(``);
    lines.push(`| Propriété | Détail |`);
    lines.push(`| :--- | :--- |`);
    lines.push(`| **Origine de la détection** | ${f.source === 'ai' ? '🧠 Analyse qualitative IA (regard humain)' : '🔍 Sonde scriptée déterministe'} |`);
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

    if (f.visualMarker?.screenshotPath) {
      const snippetFilename = path.basename(f.visualMarker.screenshotPath);
      lines.push(``);
      lines.push(`#### 📸 Diagnostic Visuel & Marqueur In-Situ`);
      lines.push(``);
      lines.push(`![Marqueur visuel ${f.id}](screenshots/${snippetFilename})`);
      lines.push(`> 📍 **Marqueur visuel #${f.visualMarker.markerNumber}** positionné sur l'élément en anomalie (\`${f.location}\`).`);
    }

    lines.push(`\n---\n`);
  }

  // Section : Audit de Conformité Accessibilité Numérique (WCAG)
  if (data.wcag) {
    lines.push(`## ${sectionIndex++}. Audit de Conformité Accessibilité Numérique (${data.wcag.standard})`);
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

  // Section 5 : Annexes & Captures d'Écran
  if (data.screenshots?.desktop || data.screenshots?.mobile || data.screenshots?.desktopAnnotated) {
    lines.push(`## 5. Annexes & Captures d'Écran`);
    lines.push(``);
    lines.push(
      `Pour archivage ou revue complémentaire, les captures d'écran générées lors de la session d'audit sont consultables ci-dessous :`
    );
    lines.push(``);
    if (data.screenshots.desktop) {
      lines.push(
        `- 🖥️ **Capture Desktop originale (1440×900) :** [\`screenshots/${path.basename(data.screenshots.desktop)}\`](screenshots/${path.basename(data.screenshots.desktop)})`
      );
    }
    if (data.screenshots.mobile) {
      lines.push(
        `- 📱 **Capture Mobile originale (375×812) :** [\`screenshots/${path.basename(data.screenshots.mobile)}\`](screenshots/${path.basename(data.screenshots.mobile)})`
      );
    }
    if (data.screenshots.desktopAnnotated) {
      lines.push(
        `- 🎯 **Capture Desktop avec Marqueurs Visuels :** [\`screenshots/${path.basename(data.screenshots.desktopAnnotated)}\`](screenshots/${path.basename(data.screenshots.desktopAnnotated)})`
      );
    }
    lines.push(``);
  }

  return lines.join('\n');
}

function getSeverityEmoji(severity: number): string {
  switch (severity) {
    case 4:
      return '🔴';
    case 3:
      return '🟠';
    case 2:
      return '🟡';
    case 1:
      return '🔵';
    default:
      return '⚪';
  }
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
