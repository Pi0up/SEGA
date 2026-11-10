import { describe, it, expect } from 'vitest';
import { calculateSegaScore } from '../src/reporter/markdown-builder';
import { Finding } from '../src/types';

describe('SEGA Score Calculator', () => {
  it('returns a perfect score of 100 when there are no findings', () => {
    const findings: Finding[] = [];
    const result = calculateSegaScore(findings);

    expect(result.score).toBe(100);
    expect(result.catastrophes).toBe(0);
    expect(result.majors).toBe(0);
    expect(result.minors).toBe(0);
    expect(result.cosmetics).toBe(0);
    expect(result.quickWins).toBe(0);
  });

  it('correctly applies penalties according to Nielsen severity levels', () => {
    // 1 catastrophe (-15), 1 major (-7), 1 minor (-2), 1 cosmetic (-0.5)
    // Total penalty = 15 + 7 + 2 + 0.5 = 24.5 => Math.round(100 - 24.5) = 76 (or 75 depending on round)
    const findings: Finding[] = [
      {
        id: 'SPEC-01',
        axis: 'axis-1',
        bastienScapinRule: '1.1 Incitation',
        nielsenRule: '#1 Visibilité de l état',
        title: 'Catastrophe issue',
        location: 'Header',
        severity: 4,
        effort: 'Moyen',
        isQuickWin: false,
        observation: 'Critical blocker',
        expectedBehavior: 'Must be fixed'
      },
      {
        id: 'SPEC-02',
        axis: 'axis-2',
        bastienScapinRule: '2.1 Brièveté',
        nielsenRule: '#8 Design épuré',
        title: 'Major issue',
        location: 'Form',
        severity: 3,
        effort: 'Faible',
        isQuickWin: true,
        observation: 'Major issue',
        expectedBehavior: 'Must be fixed'
      },
      {
        id: 'SPEC-03',
        axis: 'axis-3',
        bastienScapinRule: '3.1 Actions explicites',
        nielsenRule: '#3 Contrôle utilisateur',
        title: 'Minor issue',
        location: 'Button',
        severity: 2,
        effort: 'Faible',
        isQuickWin: true,
        observation: 'Minor issue',
        expectedBehavior: 'Must be fixed'
      },
      {
        id: 'SPEC-04',
        axis: 'axis-4',
        bastienScapinRule: '4.1 Flexibilité',
        nielsenRule: '#7 Flexibilité',
        title: 'Cosmetic issue',
        location: 'Footer',
        severity: 1,
        effort: 'Faible',
        isQuickWin: false,
        observation: 'Cosmetic polish',
        expectedBehavior: 'Must be fixed'
      }
    ];

    const result = calculateSegaScore(findings);

    expect(result.catastrophes).toBe(1);
    expect(result.majors).toBe(1);
    expect(result.minors).toBe(1);
    expect(result.cosmetics).toBe(1);
    expect(result.quickWins).toBe(2);
    expect(result.score).toBe(76);
  });

  it('clamps the score at 0 when penalties exceed 100', () => {
    // 10 catastrophes = penalty of 150
    const findings: Finding[] = Array.from({ length: 10 }, (_, i) => ({
      id: `SPEC-${i + 1}`,
      axis: 'axis-1',
      bastienScapinRule: '1.1 Incitation',
      nielsenRule: '#1 Visibilité',
      title: `Critical issue ${i + 1}`,
      location: 'Checkout',
      severity: 4,
      effort: 'Moyen',
      isQuickWin: false,
      observation: 'Blocked',
      expectedBehavior: 'Fix'
    }));

    const result = calculateSegaScore(findings);

    expect(result.score).toBe(0);
    expect(result.catastrophes).toBe(10);
  });

  it('accurately counts quick wins', () => {
    const findings: Finding[] = [
      {
        id: 'SPEC-01',
        axis: 'axis-1',
        bastienScapinRule: '1.4 Lisibilité',
        nielsenRule: '#8 Design minimaliste',
        title: 'Color contrast',
        location: 'Body',
        severity: 2,
        effort: 'Faible',
        isQuickWin: true,
        observation: 'Low contrast',
        expectedBehavior: 'Increase contrast'
      },
      {
        id: 'SPEC-02',
        axis: 'axis-8',
        bastienScapinRule: '8.0 Compatibilité',
        nielsenRule: '#6 Reconnaissance',
        title: 'Button label',
        location: 'Nav',
        severity: 3,
        effort: 'Faible',
        isQuickWin: true,
        observation: 'Icon only',
        expectedBehavior: 'Add aria-label'
      }
    ];

    const result = calculateSegaScore(findings);

    expect(result.quickWins).toBe(2);
    // 100 - (7 + 2) = 91
    expect(result.score).toBe(91);
  });
});
