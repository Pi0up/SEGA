import { Finding, FindingSource, NielsenSeverity, EffortLevel, UnifiedAxisId } from '../types';

export interface AiRawFinding {
  axis: UnifiedAxisId;
  bastienScapinRule: string;
  nielsenRule: string;
  title: string;
  location: string;
  severity: NielsenSeverity;
  effort: EffortLevel;
  isQuickWin: boolean;
  observation: string;
  expectedBehavior: string;
  microCopyBefore?: string;
  microCopyAfter?: string;
  codeSnippetBefore?: string;
  codeSnippetAfter?: string;
}

export interface AiRawResponse {
  cognitiveLoadEvaluation: string;
  toneAndMicrocopyEvaluation: string;
  navigationAndMentalModelsEvaluation: string;
  aestheticAndVisualHarmony: string;
  generalVerdict: string;
  strengths: string[];
  findings: AiRawFinding[];
}

export interface AiAnalysisRequest {
  url: string;
  pageTitle?: string;
  desktopScreenshotPath?: string;
  mobileScreenshotPath?: string;
  domSummary?: {
    headings: string[];
    buttonsCount: number;
    linksCount: number;
    formsCount: number;
    inputsCount: number;
    keyTexts: string[];
  };
  scriptFindingsCount: number;
  knownIssuesSummary?: string[];
}
