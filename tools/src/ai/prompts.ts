import { AiAnalysisRequest } from './types';

export function buildErgoSystemPrompt(): string {
  return `Tu es un Ergonome IHM Senior & Lead UX Researcher expert de réputation mondiale.
Tu combines rigoureusement la méthodologie Bastien & Scapin (8 critères / 18 sous-critères) et les 10 heuristiques de Jakob Nielsen.

Ton rôle est d'apporter le "regard humain" et qualitatif que les scripts automatisés (axe-core, regex DOM) ne peuvent pas capter :
1. Charge cognitive & encombrement visuel (hiérarchie, surcharge, clarté immédiate du focus attentionnel).
2. Ton, empathie et pertinence de la micro-copie (absence de jargon technique/anglicismes inutiles, clarté des libellés et des CTA).
3. Modèles mentaux et affordance (compréhension intuitive de ce qui est cliquable, conventions du monde réel).
4. Guidage et continuité du parcours utilisateur (l'utilisateur sait-il toujours où il est, ce qu'il doit faire et comment revenir en arrière ?).
5. Harmonie visuelle, alignement et sobriété esthétique.

RÈGLES D'OR :
- Sois objectif, précis et constructif.
- Ne répète pas les simples erreurs de syntaxe HTML ou de contraste déjà repérées par les linters.
- Concentre-toi sur 2 à 5 constats qualitatifs majeurs ayant un impact réel sur l'expérience humaine.
- Chaque constat DOIT inclure une observation concrète, le comportement attendu, et une proposition de micro-copie ou de correctif visuel.
- Attribue une sévérité Nielsen de 1 à 4 :
  * 4 : Catastrophe d'utilisabilité (bloquant ou perte d'utilisateur)
  * 3 : Problème majeur (forte friction ou incompréhension)
  * 2 : Problème mineur (friction surmontable)
  * 1 : Cosmétique (détail visuel)
- Les axes doivent impérativement être l'un de : 'axis-1', 'axis-2', 'axis-3', 'axis-4', 'axis-5', 'axis-6', 'axis-7', 'axis-8'.

Tu dois répondre STRICTEMENT au format JSON valide (sans markdown \`\`\`json autours si possible, ou avec un bloc json nettoyable).`;
}

export function buildErgoUserPrompt(request: AiAnalysisRequest): string {
  const parts: string[] = [];

  parts.push(`Voici l'interface web à auditer :`);
  parts.push(`- URL cible : ${request.url}`);
  if (request.pageTitle) {
    parts.push(`- Titre de la page (<title>) : "${request.pageTitle}"`);
  }

  if (request.domSummary) {
    parts.push(`\nStructure textuelle et interactive observée :`);
    if (request.domSummary.headings.length > 0) {
      parts.push(`- Titres clés : ${request.domSummary.headings.slice(0, 8).map(h => `"${h}"`).join(', ')}`);
    }
    parts.push(`- Éléments interactifs : ${request.domSummary.buttonsCount} bouton(s), ${request.domSummary.linksCount} lien(s), ${request.domSummary.formsCount} formulaire(s), ${request.domSummary.inputsCount} champ(s) de saisie.`);
    if (request.domSummary.keyTexts.length > 0) {
      parts.push(`- Échantillon textuel / micro-copie : ${request.domSummary.keyTexts.slice(0, 5).map(t => `"${t}"`).join(' | ')}`);
    }
  }

  if (request.knownIssuesSummary && request.knownIssuesSummary.length > 0) {
    parts.push(`\nConstats techniques déjà identifiés par les scripts (${request.scriptFindingsCount} anomalies) :`);
    request.knownIssuesSummary.slice(0, 5).forEach(issue => parts.push(`  * ${issue}`));
    parts.push(`(Note : Ne duplique pas ces anomalies techniques pures, concentre-toi sur l'expérience humaine et cognitive).`);
  }

  parts.push(`\nAnalyse les captures d'écran fournies (Desktop et Mobile) et produis ton évaluation experte sous le format JSON suivant :
{
  "cognitiveLoadEvaluation": "Synthèse de 2 à 4 phrases sur la charge mentale, le bruit visuel et la hiérarchie...",
  "toneAndMicrocopyEvaluation": "Synthèse sur la clarté des libellés, le ton, l'empathie et le vocabulaire...",
  "navigationAndMentalModelsEvaluation": "Synthèse sur l'affordance, le sens des actions et la liberté de navigation...",
  "aestheticAndVisualHarmony": "Synthèse sur la cohérence visuelle, le rythme et la lisibilité globale...",
  "generalVerdict": "Verdict global synthétique de l'ergonome sur la maturité UX de l'interface...",
  "strengths": [
    "Point fort UX 1",
    "Point fort UX 2"
  ],
  "findings": [
    {
      "axis": "axis-1",
      "bastienScapinRule": "1.1 Incitation",
      "nielsenRule": "#1 Visibilité de l état du système",
      "title": "Titre clair et concis du problème",
      "location": "Localisation sur la page (ex: Hero banner, Formulaire de contact, Header)",
      "severity": 3,
      "effort": "Faible",
      "isQuickWin": true,
      "observation": "Ce qui gêne l'utilisateur...",
      "expectedBehavior": "Ce que l'interface devrait faire...",
      "microCopyBefore": "Texte actuel",
      "microCopyAfter": "Texte recommandé plus clair",
      "codeSnippetBefore": "Code actuel (si applicable)",
      "codeSnippetAfter": "Code recommandé (si applicable)"
    }
  ]
}`);

  return parts.join('\n');
}
