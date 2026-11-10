import { AiProviderClient, EncodedImage } from './base';
import { AiAnalysisRequest, AiRawResponse } from '../types';
import { buildErgoSystemPrompt, buildErgoUserPrompt } from '../prompts';

export class AnthropicProviderClient implements AiProviderClient {
  public readonly providerName = 'anthropic';
  public readonly defaultModel = 'claude-3-5-sonnet-20241022';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        "Clé d'API Anthropic manquante. Veuillez définir ANTHROPIC_API_KEY dans vos variables d'environnement ou dans un fichier .env."
      );
    }
  }

  async analyze(
    request: AiAnalysisRequest,
    images: { desktop?: EncodedImage; mobile?: EncodedImage },
    overrideModel?: string
  ): Promise<AiRawResponse> {
    const model = overrideModel || this.defaultModel;
    const url = 'https://api.anthropic.com/v1/messages';

    const systemPrompt = buildErgoSystemPrompt();
    const userPromptText = buildErgoUserPrompt(request);

    const userContent: any[] = [];

    if (images.desktop) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: images.desktop.mimeType,
          data: images.desktop.base64
        }
      });
    }

    if (images.mobile) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: images.mobile.mimeType,
          data: images.mobile.base64
        }
      });
    }

    userContent.push({
      type: 'text',
      text: userPromptText + '\n\nImportant: Réponds UNIQUEMENT avec l\'objet JSON valide, sans aucune phrase d\'introduction ni balises markdown.'
    });

    const payload = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ],
      temperature: 0.2
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[Anthropic API] Erreur HTTP ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const rawText = data?.content?.[0]?.text;

    if (!rawText) {
      throw new Error(`[Anthropic API] Aucune réponse reçue du modèle.`);
    }

    return this.parseJsonResponse(rawText);
  }

  private parseJsonResponse(text: string): AiRawResponse {
    const cleanText = text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    try {
      return JSON.parse(cleanText) as AiRawResponse;
    } catch (e) {
      throw new Error(`Impossible de parser la réponse JSON d'Anthropic : ${cleanText.substring(0, 300)}...`);
    }
  }
}
