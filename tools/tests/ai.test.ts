import { describe, it, expect } from 'vitest';
import { calculateSegaScore, buildMarkdownReport } from '../src/reporter/markdown-builder';
import { Finding, AuditReportData } from '../src/types';
import { buildErgoSystemPrompt, buildErgoUserPrompt } from '../src/ai/prompts';
import { createAiProviderClient } from '../src/ai/providers/factory';
import { runAiErgonomicAnalysis } from '../src/ai/ai-analyzer';

describe('AI Ergonomic Analysis Module', () => {
  it('generates system and user prompts adhering to Bastien & Scapin and Nielsen guidelines', () => {
    const systemPrompt = buildErgoSystemPrompt();
    expect(systemPrompt).toContain('Bastien & Scapin');
    expect(systemPrompt).toContain('Nielsen');
    expect(systemPrompt).toContain('Charge cognitive');

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

    expect(userPrompt).toContain('https://example.com/checkout');
    expect(userPrompt).toContain('Paiement Sécurisé');
    expect(userPrompt).toContain('Validation de commande');
  });

  it('validates provider factory configurations and throws for invalid inputs', () => {
    expect(() => createAiProviderClient('gemini', '')).toThrow(/Clé d'API Google Gemini manquante/);
    expect(() => createAiProviderClient('openai', '')).toThrow(/Clé d'API OpenAI manquante/);
    expect(() => createAiProviderClient('anthropic', '')).toThrow(/Clé d'API Anthropic manquante/);
    expect(() => createAiProviderClient('invalid-provider' as any, 'dummy-key')).toThrow(/Fournisseur d'IA non pris en charge/);

    const geminiClient = createAiProviderClient('gemini', 'mock-key-123');
    expect(geminiClient.providerName).toBe('gemini');
    expect(geminiClient.defaultModel).toBe('gemini-2.5-flash');

    const openAiClient = createAiProviderClient('openai', 'mock-key-123');
    expect(openAiClient.providerName).toBe('openai');
    expect(openAiClient.defaultModel).toBe('gpt-4o');

    const anthropicClient = createAiProviderClient('anthropic', 'mock-key-123');
    expect(anthropicClient.providerName).toBe('anthropic');
    expect(anthropicClient.defaultModel).toBe('claude-3-5-sonnet-20241022');
  });

  it('computes dual SEGA score correctly separating technical and global deductions', () => {
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
    expect(metrics.technicalScore).toBe(98);
    expect(metrics.globalScore).toBe(91);
    expect(metrics.score).toBe(91);
  });

  it('generates markdown report with qualitative AI narrative section and badges', () => {
    const findings: Finding[] = [
      {
        id: 'SPEC-01',
        source: 'script',
        axis: 'axis-1',
        bastienScapinRule: '1.4 Lisibilité',
        nielsenRule: '#8 Minimalisme',
        title: 'Contraste insuffisant',
        location: 'h1',
        severity: 2,
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
        severity: 3,
        effort: 'Moyen',
        isQuickWin: false,
        observation: 'Trop de champs obligatoires en un seul bloc',
        expectedBehavior: 'Découper en 3 étapes claires'
      }
    ];

    const metrics = calculateSegaScore(findings);

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
    expect(markdown).toContain('Score SEGA Global (Technique + IA)');
    expect(markdown).toContain('Score SEGA Technique (Déterministe)');
    expect(markdown).toContain('Analyse Qualitative & Psychologie Cognitive (IA Human-Centered)');
    expect(markdown).toContain("Verdict Global de l'Ergonome IA");
    expect(markdown).toContain('🤖 [IA / Qualitatif]');
    expect(markdown).toContain('⚙️ [Script / Technique]');
  });

  it('degrades gracefully without crashing when API is disabled or unavailable', async () => {
    const emptyResult = await runAiErgonomicAnalysis({
      config: { enabled: false, provider: 'gemini' },
      request: { url: 'https://example.com', scriptFindingsCount: 0 }
    });
    expect(emptyResult).toBeUndefined();

    const fallbackResult = await runAiErgonomicAnalysis({
      config: { enabled: true, provider: 'gemini', apiKey: 'invalid-non-working-key' },
      request: { url: 'https://example.com', scriptFindingsCount: 0 }
    });
    expect(fallbackResult).toBeUndefined();
  });
});
