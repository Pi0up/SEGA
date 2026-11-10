import { AiProviderClient, EncodedImage } from './base';
import { AiAnalysisRequest, AiRawResponse } from '../types';
import { buildErgoSystemPrompt, buildErgoUserPrompt } from '../prompts';

export class GeminiProviderClient implements AiProviderClient {
  public readonly providerName = 'gemini';
  public readonly defaultModel = 'gemini-2.5-flash';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        "Clé d'API Google Gemini manquante. Veuillez définir GEMINI_API_KEY dans vos variables d'environnement ou dans un fichier .env."
      );
    }
  }

  async analyze(
    request: AiAnalysisRequest,
    images: { desktop?: EncodedImage; mobile?: EncodedImage },
    overrideModel?: string
  ): Promise<AiRawResponse> {
    const model = overrideModel || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const systemPrompt = buildErgoSystemPrompt();
    const userPromptText = buildErgoUserPrompt(request);

    const parts: any[] = [{ text: userPromptText }];

    if (images.desktop) {
      parts.push({
        inlineData: {
          mimeType: images.desktop.mimeType,
          data: images.desktop.base64
        }
      });
    }

    if (images.mobile) {
      parts.push({
        inlineData: {
          mimeType: images.mobile.mimeType,
          data: images.mobile.base64
        }
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[Gemini API] Erreur HTTP ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error(`[Gemini API] Aucune réponse textuelle reçue du modèle.`);
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
      throw new Error(`Impossible de parser la réponse JSON de Gemini : ${cleanText.substring(0, 300)}...`);
    }
  }
}
