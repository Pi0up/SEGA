import { AiAnalysisRequest, AiRawResponse } from '../types';

export interface EncodedImage {
  base64: string;
  mimeType: string;
}

export interface AiProviderClient {
  providerName: string;
  defaultModel: string;
  analyze(
    request: AiAnalysisRequest,
    images: {
      desktop?: EncodedImage;
      mobile?: EncodedImage;
    },
    overrideModel?: string
  ): Promise<AiRawResponse>;
}
