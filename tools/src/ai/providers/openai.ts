import { AiProviderClient, EncodedImage } from './base';
import { AiAnalysisRequest, AiRawResponse } from '../types';
import { buildErgoSystemPrompt, buildErgoUserPrompt } from '../prompts';

export class OpenAiProviderClient implements AiProviderClient {
  public readonly providerName = 'openai';
  public readonly defaultModel = 'gpt-4o';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        "Clé d'API OpenAI manquante. Veuillez définir OPENAI_API_KEY dans vos variables d'environnement ou dans un fichier .env."
      );
    }
  }

  async analyze(
    request: AiAnalysisRequest,
    images: { desktop?: EncodedImage; mobile?: EncodedImage },
    overrideModel?: string
  ): Promise<AiRawResponse> {
    const model = overrideModel || this.defaultModel;
    const url = 'https://api.openai.com/v1/chat/completions';

    const systemPrompt = buildErgoSystemPrompt();
    const userPromptText = buildErgoUserPrompt(request);

    const userContent: any[] = [{ type: 'text', text: userPromptText }];

    if (images.desktop) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${images.desktop.mimeType};base64,${images.desktop.base64}`
        }
      });
    }

    if (images.mobile) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${images.mobile.mimeType};base64,${images.mobile.base64}`
        }
      });
    }

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[OpenAI API] Erreur HTTP ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;

    if (!rawText) {
      throw new Error(`[OpenAI API] Aucune réponse reçue du modèle.`);
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
      throw new Error(`Impossible de parser la réponse JSON d'OpenAI : ${cleanText.substring(0, 300)}...`);
    }
  }
}
