import { AiProvider } from '../../types';
import { AiProviderClient } from './base';
import { GeminiProviderClient } from './gemini';
import { OpenAiProviderClient } from './openai';
import { AnthropicProviderClient } from './anthropic';

export function createAiProviderClient(provider: AiProvider, apiKey?: string): AiProviderClient {
  switch (provider) {
    case 'gemini':
      return new GeminiProviderClient(apiKey);
    case 'openai':
      return new OpenAiProviderClient(apiKey);
    case 'anthropic':
      return new AnthropicProviderClient(apiKey);
    default:
      throw new Error(`Fournisseur d'IA non pris en charge : "${provider}". Choisissez parmi 'gemini', 'openai' ou 'anthropic'.`);
  }
}
