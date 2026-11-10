export type UnifiedAxisId =
  | 'axis-1' // Guidage & Visibilité de l'état
  | 'axis-2' // Charge de travail & Concision
  | 'axis-3' // Contrôle utilisateur & Liberté
  | 'axis-4' // Adaptabilité & Flexibilité
  | 'axis-5' // Gestion des erreurs & Résilience
  | 'axis-6' // Homogénéité & Standards
  | 'axis-7' // Signifiance des codes & Monde réel
  | 'axis-8'; // Reconnaissance & Affordance

export interface UnifiedAxisInfo {
  id: UnifiedAxisId;
  title: string;
  bastienScapin: string[];
  nielsen: string[];
  description: string;
}

export const UNIFIED_AXES: Record<UnifiedAxisId, UnifiedAxisInfo> = {
  'axis-1': {
    id: 'axis-1',
    title: "1. Guidage & Visibilité de l'état",
    bastienScapin: ['1.1 Incitation', '1.2 Groupement/Distinction', '1.3 Feedback immédiat', '1.4 Lisibilité'],
    nielsen: ['#1 Visibilité de l état du système', '#8 Design esthétique et minimaliste'],
    description: "Orientation, clarté de l'état, contrastes et retours visuels immédiats."
  },
  'axis-2': {
    id: 'axis-2',
    title: '2. Charge de travail & Concision',
    bastienScapin: ['2.1 Brièveté (Concision, Actions minimales)', '2.2 Densité informationnelle'],
    nielsen: ['#8 Design épuré', '#7 Efficience'],
    description: 'Minimisation du nombre de clics, brièveté des flux et sobriété visuelle.'
  },
  'axis-3': {
    id: 'axis-3',
    title: '3. Contrôle utilisateur & Liberté',
    bastienScapin: ['3.1 Actions explicites', '3.2 Contrôle utilisateur'],
    nielsen: ['#3 Contrôle et liberté de l utilisateur'],
    description: 'Issues de secours (Échap, Annuler), dialogue de confirmation et maîtrise des flux.'
  },
  'axis-4': {
    id: 'axis-4',
    title: '4. Adaptabilité & Flexibilité',
    bastienScapin: ['4.1 Flexibilité', '4.2 Prise en compte de l expérience'],
    nielsen: ['#7 Flexibilité et efficience d usage'],
    description: 'Raccourcis clavier, robustesse responsive multi-devices et personnalisation.'
  },
  'axis-5': {
    id: 'axis-5',
    title: '5. Gestion des erreurs & Résilience',
    bastienScapin: ['5.1 Protection contre les erreurs', '5.2 Qualité des messages d erreur', '5.3 Correction des erreurs'],
    nielsen: ['#5 Prévention des erreurs', '#9 Aide à la correction'],
    description: 'Validation en ligne, messages explicites et sauvegarde des données saisies.'
  },
  'axis-6': {
    id: 'axis-6',
    title: '6. Homogénéité & Standards',
    bastienScapin: ['6.0 Homogénéité et Cohérence'],
    nielsen: ['#4 Cohérence et standards'],
    description: 'Cohérence interne des styles, composants et respect des conventions externes.'
  },
  'axis-7': {
    id: 'axis-7',
    title: '7. Signifiance des codes & Monde réel',
    bastienScapin: ['7.0 Signifiance des codes et dénominations'],
    nielsen: ['#2 Correspondance avec le monde réel'],
    description: 'Vocabulaire métier sans jargon technique, métaphores claires et formats locaux.'
  },
  'axis-8': {
    id: 'axis-8',
    title: '8. Reconnaissance & Affordance',
    bastienScapin: ['8.0 Compatibilité'],
    nielsen: ['#6 Reconnaissance plutôt que rappel', '#10 Aide et documentation'],
    description: 'Affordance claire des éléments cliquables et réduction de la charge mnésique.'
  }
};

export type NielsenSeverity = 0 | 1 | 2 | 3 | 4;

export type EffortLevel = 'Faible' | 'Moyen' | 'Élevé';

export interface Finding {
  id: string;
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
  wcagCriterion?: string;
}

export type WcagPrinciple = 'Perceptible' | 'Utilisable' | 'Compréhensible' | 'Robuste';

export interface WcagViolationNode {
  target: string;
  html: string;
  failureSummary?: string;
}

export interface WcagViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriteria: string[];
  wcagPrinciple: WcagPrinciple;
  description: string;
  help: string;
  helpUrl: string;
  nodesCount: number;
  nodes: WcagViolationNode[];
}

export interface WcagReportData {
  enabled: boolean;
  standard: string;
  testedRulesCount: number;
  passesCount: number;
  violationsCount: number;
  incompleteCount: number;
  complianceRate: number;
  violations: WcagViolation[];
  byPrinciple: {
    perceivable: number;
    operable: number;
    understandable: number;
    robust: number;
  };
  byImpact: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export interface AuditReportData {
  target: string;
  date: string;
  segaScore: number;
  findings: Finding[];
  screenshots?: {
    desktop?: string;
    mobile?: string;
  };
  metrics: {
    totalFindings: number;
    catastrophes: number;
    majors: number;
    minors: number;
    cosmetics: number;
    quickWins: number;
  };
  wcag?: WcagReportData;
}
