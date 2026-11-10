import { describe, it, expect } from 'vitest';
import {
  resolveWcagTags,
  determineWcagPrinciple,
  mapWcagToErgonomicAxis,
  mapImpactToSeverityAndEffort,
  generatePrescriptiveCodeDiff
} from '../src/wcag/wcag-analyzer';

describe('WCAG Analyzer & Translation Utilities', () => {
  describe('resolveWcagTags', () => {
    it('defaults to WCAG 2.1 AA when no input or standard string is provided', () => {
      const result = resolveWcagTags();
      expect(result.standard).toBe('WCAG 2.1 AA');
      expect(result.tags).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    });

    it('resolves WCAG 2.2 AA correctly', () => {
      const result = resolveWcagTags('2.2AA');
      expect(result.standard).toBe('WCAG 2.2 AA');
      expect(result.tags).toContain('wcag22aa');
    });

    it('resolves WCAG 2.1 AAA correctly', () => {
      const result = resolveWcagTags('2.1AAA');
      expect(result.standard).toBe('WCAG 2.1 AAA');
      expect(result.tags).toContain('wcag2aaa');
    });

    it('resolves WCAG 2.0 A correctly', () => {
      const result = resolveWcagTags('2.0A');
      expect(result.standard).toBe('WCAG 2.0 A');
      expect(result.tags).toEqual(['wcag2a']);
    });
  });

  describe('determineWcagPrinciple', () => {
    it('identifies principle by WCAG tag digit', () => {
      expect(determineWcagPrinciple(['wcag143'], 'color-contrast')).toBe('Perceptible');
      expect(determineWcagPrinciple(['wcag211'], 'keyboard')).toBe('Utilisable');
      expect(determineWcagPrinciple(['wcag332'], 'label')).toBe('Compréhensible');
      expect(determineWcagPrinciple(['wcag412'], 'button-name')).toBe('Robuste');
    });

    it('falls back to rule identification when tags lack numeric prefix', () => {
      expect(determineWcagPrinciple(['cat.color'], 'color-contrast')).toBe('Perceptible');
      expect(determineWcagPrinciple(['cat.keyboard'], 'tabindex')).toBe('Utilisable');
      expect(determineWcagPrinciple(['cat.forms'], 'label')).toBe('Compréhensible');
      expect(determineWcagPrinciple(['cat.aria'], 'button-name')).toBe('Robuste');
    });
  });

  describe('mapWcagToErgonomicAxis', () => {
    it('maps color-contrast to axis-1 (Lisibilité & Design minimaliste)', () => {
      const mapping = mapWcagToErgonomicAxis('color-contrast', 'Perceptible');
      expect(mapping.axis).toBe('axis-1');
      expect(mapping.bastienScapinRule).toContain('Lisibilité');
      expect(mapping.nielsenRule).toContain('Design esthétique');
    });

    it('maps button-name to axis-8 (Compatibilité & Reconnaissance)', () => {
      const mapping = mapWcagToErgonomicAxis('button-name', 'Robuste');
      expect(mapping.axis).toBe('axis-8');
      expect(mapping.bastienScapinRule).toContain('Compatibilité');
      expect(mapping.nielsenRule).toContain('Reconnaissance');
    });

    it('maps tabindex to axis-4 (Flexibilité)', () => {
      const mapping = mapWcagToErgonomicAxis('tabindex', 'Utilisable');
      expect(mapping.axis).toBe('axis-4');
      expect(mapping.bastienScapinRule).toContain('Flexibilité');
    });
  });

  describe('mapImpactToSeverityAndEffort', () => {
    it('maps critical impact to severity 4', () => {
      const result = mapImpactToSeverityAndEffort('critical');
      expect(result.severity).toBe(4);
      expect(result.isQuickWin).toBe(false);
    });

    it('maps serious impact to severity 3 with quick win', () => {
      const result = mapImpactToSeverityAndEffort('serious');
      expect(result.severity).toBe(3);
      expect(result.isQuickWin).toBe(true);
    });

    it('maps moderate impact to severity 2 with quick win', () => {
      const result = mapImpactToSeverityAndEffort('moderate');
      expect(result.severity).toBe(2);
      expect(result.isQuickWin).toBe(true);
    });

    it('maps minor impact to severity 1', () => {
      const result = mapImpactToSeverityAndEffort('minor');
      expect(result.severity).toBe(1);
      expect(result.isQuickWin).toBe(false);
    });
  });

  describe('generatePrescriptiveCodeDiff', () => {
    it('generates prescriptive diff for color-contrast', () => {
      const diff = generatePrescriptiveCodeDiff('color-contrast');
      expect(diff.before).toContain('color:');
      expect(diff.after).toContain('WCAG AA');
    });

    it('generates prescriptive diff for image-alt', () => {
      const diff = generatePrescriptiveCodeDiff('image-alt');
      expect(diff.after).toContain('alt=');
    });

    it('generates prescriptive diff for button-name', () => {
      const diff = generatePrescriptiveCodeDiff('button-name');
      expect(diff.after).toContain('aria-label');
    });
  });
});
