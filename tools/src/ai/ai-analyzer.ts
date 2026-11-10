import * as fs from 'fs';
import * as path from 'path';
import { Finding, AiConfig, AiAnalysisResult, UnifiedAxisId, NielsenSeverity, EffortLevel } from '../types';
import { AiAnalysisRequest, AiRawFinding, AiRawResponse } from './types';
import { createAiProviderClient } from './providers/factory';
import { EncodedImage } from './providers/base';

export interface RunAiAnalysisOptions {
  config: AiConfig;
  request: AiAnalysisRequest;
  nextFindingId?: () => string;
}

function encodeImageFile(filePath?: string): EncodedImage | undefined {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return {
      base64: buffer.toString('base64'),
      mimeType
    };
  } catch (err) {
    console.warn(`[Ergo-Review AI] Impossible d'encoder l'image ${filePath} :`, err);
    return undefined;
  }
}

export async function runAiErgonomicAnalysis(
  options: RunAiAnalysisOptions
): Promise<AiAnalysisResult | undefined> {
  const { config, request } = options;

  if (!config.enabled) {
    return undefined;
  }

  const providerName = config.provider || 'gemini';
  console.log(`[Ergo-Review AI] 🧠 Lancement de l'analyse qualitative humaine via ${providerName.toUpperCase()}...`);

  try {
    const client = createAiProviderClient(providerName, config.apiKey);
    const modelToUse = config.model || client.defaultModel;

    console.log(`[Ergo-Review AI] 🤖 Modèle sélectionné : ${modelToUse}`);

    // Encoder les captures d'écran en base64 pour l'analyse multimodale
    const desktopImage = encodeImageFile(request.desktopScreenshotPath);
    const mobileImage = encodeImageFile(request.mobileScreenshotPath);

    if (desktopImage || mobileImage) {
      console.log(
        `[Ergo-Review AI] 📸 Analyse multimodale activée (${[
          desktopImage ? 'Desktop 1440px' : null,
          mobileImage ? 'Mobile 375px' : null
        ]
          .filter(Boolean)
          .join(' + ')})`
      );
    } else {
      console.log(`[Ergo-Review AI] ℹ️ Aucune capture d'écran disponible, analyse basée sur les métadonnées de page.`);
    }

    const rawResponse: AiRawResponse = await client.analyze(
      request,
      {
        desktop: desktopImage,
        mobile: mobileImage
      },
      config.model
    );

    // Normalisation des constats de l'IA au format Finding standard
    let aiCounter = 1;
    const validatedFindings: Finding[] = (rawResponse.findings || []).map((raw: AiRawFinding) => {
      const id = options.nextFindingId
        ? options.nextFindingId()
        : `SPEC-AI-${String(aiCounter++).padStart(2, '0')}`;

      // Validation de l'axe unifié
      const validAxes: UnifiedAxisId[] = [
        'axis-1',
        'axis-2',
        'axis-3',
        'axis-4',
        'axis-5',
        'axis-6',
        'axis-7',
        'axis-8'
      ];
      const axis: UnifiedAxisId = validAxes.includes(raw.axis) ? raw.axis : 'axis-1';

      // Validation de la sévérité Nielsen (1-4)
      const severity: NielsenSeverity = [1, 2, 3, 4].includes(raw.severity)
        ? (raw.severity as NielsenSeverity)
        : 2;

      // Validation de l'effort
      const effort: EffortLevel = ['Faible', 'Moyen', 'Élevé'].includes(raw.effort)
        ? raw.effort
        : 'Moyen';

      const isQuickWin = raw.isQuickWin ?? (severity <= 3 && effort === 'Faible');

      return {
        id,
        source: 'ai',
        axis,
        bastienScapinRule: raw.bastienScapinRule || '1.1 Incitation',
        nielsenRule: raw.nielsenRule || '#1 Visibilité de l état du système',
        title: raw.title || 'Observation ergonomique qualitative',
        location: raw.location || 'Interface globale',
        severity,
        effort,
        isQuickWin,
        observation: raw.observation || '',
        expectedBehavior: raw.expectedBehavior || '',
        microCopyBefore: raw.microCopyBefore,
        microCopyAfter: raw.microCopyAfter,
        codeSnippetBefore: raw.codeSnippetBefore,
        codeSnippetAfter: raw.codeSnippetAfter,
        pageUrl: request.url,
        pageTitle: request.pageTitle
      };
    });

    console.log(
      `[Ergo-Review AI] ✅ Analyse IA terminée : ${validatedFindings.length} constat(s) qualitatif(s) identifié(s).`
    );

    return {
      provider: providerName,
      model: modelToUse,
      narrativeSummary: {
        cognitiveLoadEvaluation:
          rawResponse.cognitiveLoadEvaluation || 'Charge cognitive modérée.',
        toneAndMicrocopyEvaluation:
          rawResponse.toneAndMicrocopyEvaluation || 'Micro-copie fonctionnelle.',
        navigationAndMentalModelsEvaluation:
          rawResponse.navigationAndMentalModelsEvaluation || 'Modèles mentaux standards.',
        aestheticAndVisualHarmony:
          rawResponse.aestheticAndVisualHarmony || 'Harmonie visuelle équilibrée.',
        generalVerdict:
          rawResponse.generalVerdict || 'Interface utilisable avec opportunités d amélioration.',
        strengths: Array.isArray(rawResponse.strengths) ? rawResponse.strengths : []
      },
      findings: validatedFindings
    };
  } catch (err: any) {
    console.warn(`\n[Ergo-Review AI] ⚠️ Dégradation gracieuse : L'analyse IA n'a pas pu aboutir.`);
    console.warn(`[Ergo-Review AI] Détail de l'incident : ${err?.message || err}`);
    console.warn(`[Ergo-Review AI] L'audit continue normalement avec les règles et métriques techniques.\n`);
    return undefined;
  }
}
