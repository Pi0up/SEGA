import assert from 'assert';
import { calculateSegaScore, buildMarkdownReport } from '../reporter/markdown-builder';
import { Finding, AuditReportData } from '../types';
import { buildErgoSystemPrompt, buildErgoUserPrompt } from '../ai/prompts';
import { createAiProviderClient } from '../ai/providers/factory';
import { runAiErgonomicAnalysis } from '../ai/ai-analyzer';

async function runTests() {
  console.log('[Test Suite] Démarrage des tests unitaires du module IA...');

  // Test 1: Prompt builders
  console.log('1. Test des générateurs de prompts ergonomiques...');
  const systemPrompt = buildErgoSystemPrompt();
  assert.ok(systemPrompt.includes('Bastien & Scapin'), 'Le prompt système doit mentionner Bastien & Scapin');
  assert.ok(systemPrompt.includes('Nielsen'), 'Le prompt système doit mentionner Nielsen');
  assert.ok(systemPrompt.includes('Charge cognitive'), 'Le prompt système doit mentionner la charge cognitive');

  const userPrompt = buildErgoUserPrompt({
    url: 'https://example.com/checkout',
    pageTitle: 'Paiement Sécurisé',
    domSummary: {
      headings: ['Validation de commande', 'Coordonnées'],
      buttonsCount: 2,
      linksCount: 5,
      formsCount: 1,
      inputsCount: 4,
      keyTexts: ['Votre panier est prêt', 'Cliquez pour payer']
    },
    scriptFindingsCount: 1,
    knownIssuesSummary: ['[axis-1] Manque de contraste']
  });
  assert.ok(userPrompt.includes('https://example.com/checkout'), 'Le prompt utilisateur doit inclure l URL');
  assert.ok(userPrompt.includes('Paiement Sécurisé'), 'Le prompt utilisateur doit inclure le titre');
  assert.ok(userPrompt.includes('Validation de commande'), 'Le prompt utilisateur doit inclure les headings');

  // Test 2: Provider Factory
  console.log('2. Test de la factory des providers IA...');
  assert.throws(() => createAiProviderClient('gemini', ''), /Clé d'API Google Gemini manquante/);
  assert.throws(() => createAiProviderClient('openai', ''), /Clé d'API OpenAI manquante/);
  assert.throws(() => createAiProviderClient('anthropic', ''), /Clé d'API Anthropic manquante/);
  assert.throws(() => createAiProviderClient('invalid-provider' as any, 'dummy-key'), /Fournisseur d'IA non pris en charge/);

  const geminiClient = createAiProviderClient('gemini', 'mock-key-123');
  assert.strictEqual(geminiClient.providerName, 'gemini');
  assert.strictEqual(geminiClient.defaultModel, 'gemini-2.5-flash');

  const openAiClient = createAiProviderClient('openai', 'mock-key-123');
  assert.strictEqual(openAiClient.providerName, 'openai');
  assert.strictEqual(openAiClient.defaultModel, 'gpt-4o');

  const anthropicClient = createAiProviderClient('anthropic', 'mock-key-123');
  assert.strictEqual(anthropicClient.providerName, 'anthropic');
  assert.strictEqual(anthropicClient.defaultModel, 'claude-3-5-sonnet-20241022');

  // Test 3: Dual SEGA score computation
  console.log('3. Test du double calcul de score SEGA (Technique vs Global)...');
  const findings: Finding[] = [
    {
      id: 'SPEC-01',
      source: 'script',
      axis: 'axis-1',
      bastienScapinRule: '1.4 Lisibilité',
      nielsenRule: '#8 Minimalisme',
      title: 'Contraste insuffisant',
      location: 'h1',
      severity: 2, // -2 points
      effort: 'Faible',
      isQuickWin: true,
      observation: 'Faible contraste',
      expectedBehavior: 'Contraste >= 4.5:1'
    },
    {
      id: 'SPEC-AI-01',
      source: 'ai',
      axis: 'axis-2',
      bastienScapinRule: '2.1 Brièveté',
      nielsenRule: '#8 Minimalisme',
      title: 'Tunnel de commande surchargé cognitivement',
      location: 'Formulaire checkout',
      severity: 3, // -7 points
      effort: 'Moyen',
      isQuickWin: false,
      observation: 'Trop de champs obligatoires en un seul bloc',
      expectedBehavior: 'Découper en 3 étapes claires'
    }
  ];

  const metrics = calculateSegaScore(findings);
  assert.strictEqual(metrics.technicalScore, 98, 'Score technique doit valoir 100 - 2 = 98');
  assert.strictEqual(metrics.globalScore, 91, 'Score global doit valoir 100 - (2 + 7) = 91');
  assert.strictEqual(metrics.score, 91, 'Score global doit être le score par défaut');

  // Test 4: Markdown report generation with AI narrative section
  console.log('4. Test de la génération de rapport Markdown enrichi avec l IA...');
  const reportData: AuditReportData = {
    target: 'https://example.com/checkout',
    date: '2026-11-10',
    segaScore: metrics.score,
    segaScoreTechnical: metrics.technicalScore,
    segaScoreGlobal: metrics.globalScore,
    findings,
    metrics: {
      totalFindings: 2,
      catastrophes: 0,
      majors: 1,
      minors: 1,
      cosmetics: 0,
      quickWins: 1,
      technicalScore: metrics.technicalScore,
      globalScore: metrics.globalScore
    },
    aiAnalysis: {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      narrativeSummary: {
        cognitiveLoadEvaluation: 'La page présente une densité informative élevée créant une fatigue visuelle.',
        toneAndMicrocopyEvaluation: 'Le ton est impersonnel et technique ("Valider le payload").',
        navigationAndMentalModelsEvaluation: 'Affordance faible sur le bouton d annulation.',
        aestheticAndVisualHarmony: 'Disposition aérée mais déséquilibrée en colonne gauche.',
        generalVerdict: 'Parcours fonctionnel mais nécessitant un allègement cognitif urgent.',
        strengths: ['Processus sécurisé explicite', 'Bannière de confiance bien visible']
      },
      findings: [findings[1]]
    }
  };

  const markdown = buildMarkdownReport(reportData);
  assert.ok(markdown.includes('Score SEGA Global (Technique + IA)'), 'Le rapport doit afficher le score global');
  assert.ok(markdown.includes('Score SEGA Technique (Déterministe)'), 'Le rapport doit afficher le score technique');
  assert.ok(markdown.includes('Analyse Qualitative & Psychologie Cognitive (IA Human-Centered)'), 'Le rapport doit inclure la section IA');
  assert.ok(markdown.includes('Verdict Global de l\'Ergonome IA'), 'Le rapport doit inclure le verdict');
  assert.ok(markdown.includes('🤖 [IA / Qualitatif]'), 'Le constat IA doit être badgé [IA / Qualitatif]');
  assert.ok(markdown.includes('⚙️ [Script / Technique]'), 'Le constat scripté doit être badgé [Script / Technique]');

  // Test 5: Graceful degradation in analyzer
  console.log('5. Test de la dégradation gracieuse sans crash...');
  const emptyResult = await runAiErgonomicAnalysis({
    config: { enabled: false, provider: 'gemini' },
    request: { url: 'https://example.com', scriptFindingsCount: 0 }
  });
  assert.strictEqual(emptyResult, undefined, 'Si désactivé, runAiErgonomicAnalysis retourne undefined sans planter');

  const fallbackResult = await runAiErgonomicAnalysis({
    config: { enabled: true, provider: 'gemini', apiKey: 'invalid-non-working-key' },
    request: { url: 'https://example.com', scriptFindingsCount: 0 }
  });
  assert.strictEqual(fallbackResult, undefined, 'En cas d échec API, doit renvoyer undefined avec un avertissement gracieux');

  console.log('✅ Tous les tests unitaires du module IA ont réussi avec succès !');
}

runTests().catch((err) => {
  console.error('❌ Échec des tests :', err);
  process.exit(1);
});
