import { describe, it, expect } from 'vitest';
import { UNIFIED_AXES, UnifiedAxisId } from '../src/types';

describe('Unified Heuristic Matrix (Bastien & Scapin × Nielsen)', () => {
  const expectedAxes: UnifiedAxisId[] = [
    'axis-1',
    'axis-2',
    'axis-3',
    'axis-4',
    'axis-5',
    'axis-6',
    'axis-7',
    'axis-8'
  ];

  it('contains exactly the 8 canonical meta-axes', () => {
    const keys = Object.keys(UNIFIED_AXES);
    expect(keys).toHaveLength(8);
    for (const axisId of expectedAxes) {
      expect(UNIFIED_AXES).toHaveProperty(axisId);
    }
  });

  it('each meta-axis defines a title, description, Bastien & Scapin criteria and Nielsen heuristics', () => {
    for (const axisId of expectedAxes) {
      const axis = UNIFIED_AXES[axisId];

      expect(axis.id).toBe(axisId);
      expect(axis.title).toBeTruthy();
      expect(typeof axis.title).toBe('string');

      expect(axis.description).toBeTruthy();
      expect(typeof axis.description).toBe('string');

      expect(Array.isArray(axis.bastienScapin)).toBe(true);
      expect(axis.bastienScapin.length).toBeGreaterThan(0);

      expect(Array.isArray(axis.nielsen)).toBe(true);
      expect(axis.nielsen.length).toBeGreaterThan(0);
    }
  });

  it('verifies key axis title definitions match UX standards', () => {
    expect(UNIFIED_AXES['axis-1'].title).toContain('Guidage');
    expect(UNIFIED_AXES['axis-2'].title).toContain('Charge de travail');
    expect(UNIFIED_AXES['axis-3'].title).toContain('Contrôle utilisateur');
    expect(UNIFIED_AXES['axis-4'].title).toContain('Adaptabilité');
    expect(UNIFIED_AXES['axis-5'].title).toContain('Gestion des erreurs');
    expect(UNIFIED_AXES['axis-6'].title).toContain('Homogénéité');
    expect(UNIFIED_AXES['axis-7'].title).toContain('Signifiance des codes');
    expect(UNIFIED_AXES['axis-8'].title).toContain('Reconnaissance & Affordance');
  });
});
