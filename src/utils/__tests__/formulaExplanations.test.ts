import { describe, it, expect } from 'vitest';
import {
  formulaExplanations,
  getFormulaExplanation,
  getFormula,
  getAllSignalKeys,
} from '../formulaExplanations';

describe('formulaExplanations', () => {
  describe('completeness', () => {
    it('has exactly 18 signals documented', () => {
      expect(Object.keys(formulaExplanations)).toHaveLength(18);
    });

    it('has all required Direction pillar signals', () => {
      expect(formulaExplanations).toHaveProperty('spyVs200MA');
      expect(formulaExplanations).toHaveProperty('qqqVs200MA');
      expect(formulaExplanations).toHaveProperty('iwmVs200MA');
    });

    it('has all required Breadth pillar signals', () => {
      expect(formulaExplanations).toHaveProperty('advanceDeclineRatio');
      expect(formulaExplanations).toHaveProperty('percentAbove200MA');
      expect(formulaExplanations).toHaveProperty('newHighsVsLows');
    });

    it('has all required Volatility pillar signals', () => {
      expect(formulaExplanations).toHaveProperty('vix');
      expect(formulaExplanations).toHaveProperty('putCallRatio');
      expect(formulaExplanations).toHaveProperty('vixTermStructure');
    });

    it('has all required Credit pillar signals', () => {
      expect(formulaExplanations).toHaveProperty('yieldCurve10Y2Y');
      expect(formulaExplanations).toHaveProperty('highYieldSpread');
      expect(formulaExplanations).toHaveProperty('investmentGradeSpread');
    });

    it('has all required Sentiment pillar signals', () => {
      expect(formulaExplanations).toHaveProperty('aaiiBulls');
      expect(formulaExplanations).toHaveProperty('aaiiBears');
      expect(formulaExplanations).toHaveProperty('fearGreedIndex');
    });

    it('has all required Global pillar signals', () => {
      expect(formulaExplanations).toHaveProperty('msciWorldVs50MA');
      expect(formulaExplanations).toHaveProperty('vstoxx');
      expect(formulaExplanations).toHaveProperty('globalPMI');
    });
  });

  describe('structure validation', () => {
    const allSignals = Object.entries(formulaExplanations);

    it('all formulas have required name field', () => {
      allSignals.forEach(([_key, formula]) => {
        expect(formula.name).toBeDefined();
        expect(typeof formula.name).toBe('string');
        expect(formula.name.length).toBeGreaterThan(0);
      });
    });

    it('all formulas have required formula field', () => {
      allSignals.forEach(([_key, formula]) => {
        expect(formula.formula).toBeDefined();
        expect(typeof formula.formula).toBe('string');
        expect(formula.formula.length).toBeGreaterThan(0);
      });
    });

    it('all formulas have required bounds field', () => {
      allSignals.forEach(([_key, formula]) => {
        expect(formula.bounds).toBeDefined();
        expect(typeof formula.bounds).toBe('string');
        expect(formula.bounds.length).toBeGreaterThan(0);
      });
    });

    it('all formulas have non-empty thresholds array', () => {
      allSignals.forEach(([_key, formula]) => {
        expect(formula.thresholds).toBeDefined();
        expect(Array.isArray(formula.thresholds)).toBe(true);
        expect(formula.thresholds.length).toBeGreaterThan(0);
      });
    });

    it('all thresholds have required fields', () => {
      allSignals.forEach(([_key, formula]) => {
        formula.thresholds.forEach((threshold) => {
          expect(threshold.range).toBeDefined();
          expect(threshold.label).toBeDefined();
          expect(threshold.scoreRange).toBeDefined();
        });
      });
    });

    it('all formulas have rationale under 200 characters', () => {
      allSignals.forEach(([_key, formula]) => {
        expect(formula.rationale).toBeDefined();
        expect(formula.rationale.length).toBeGreaterThan(0);
        expect(formula.rationale.length).toBeLessThan(200);
      });
    });
  });

  describe('specific formula validation', () => {
    it('VIX formula has correct structure', () => {
      const vix = formulaExplanations.vix;
      expect(vix.name).toBe('VIX (Volatility Index)');
      expect(vix.thresholds.length).toBeGreaterThanOrEqual(5);
      expect(vix.rationale).toContain('volatility');
    });

    it('Put/Call ratio is contrarian indicator', () => {
      const putCall = formulaExplanations.putCallRatio;
      expect(putCall.formula.toLowerCase()).toContain('contrarian');
    });

    it('VIX term structure is binary', () => {
      const vixTerm = formulaExplanations.vixTermStructure;
      expect(vixTerm.bounds).toContain('binary');
      expect(vixTerm.thresholds).toHaveLength(2);
    });

    it('AAII Bulls is contrarian indicator', () => {
      const aaii = formulaExplanations.aaiiBulls;
      expect(aaii.formula.toLowerCase()).toContain('contrarian');
    });

    it('PMI threshold at 50 indicates expansion/contraction boundary', () => {
      const pmi = formulaExplanations.globalPMI;
      const thresholdLabels = pmi.thresholds.map((t) => t.label.toLowerCase());
      expect(thresholdLabels.some((l) => l.includes('expansion'))).toBe(true);
      expect(thresholdLabels.some((l) => l.includes('contraction'))).toBe(true);
    });
  });
});

describe('getFormulaExplanation', () => {
  it('returns formatted string for valid signal', () => {
    const result = getFormulaExplanation('vix', 18.5, 70);
    expect(typeof result).toBe('string');
    expect(result).toContain('VIX');
    expect(result).toContain('18.5');
    expect(result).toContain('70');
  });

  it('returns "Formula not available" for invalid signal', () => {
    const result = getFormulaExplanation('invalidSignal', 50, 50);
    expect(result).toBe('Formula not available');
  });

  it('handles boolean raw value (VIX term structure)', () => {
    const contango = getFormulaExplanation('vixTermStructure', true, 70);
    expect(contango).toContain('Contango');

    const backwardation = getFormulaExplanation('vixTermStructure', false, 30);
    expect(backwardation).toContain('Backwardation');
  });

  it('includes all required sections in output', () => {
    const result = getFormulaExplanation('spyVs200MA', 5.5, 85);
    expect(result).toContain('Raw Value:');
    expect(result).toContain('Formula:');
    expect(result).toContain('Bounded:');
    expect(result).toContain('Current Score:');
    expect(result).toContain('Thresholds:');
  });

  it('includes rationale at the end', () => {
    const result = getFormulaExplanation('vix', 15, 85);
    // Rationale should be part of the content
    expect(result).toContain('volatility');
  });
});

describe('getFormula', () => {
  it('returns formula for valid key', () => {
    const formula = getFormula('vix');
    expect(formula).toBeDefined();
    expect(formula?.name).toBe('VIX (Volatility Index)');
  });

  it('returns undefined for invalid key', () => {
    const formula = getFormula('nonexistent');
    expect(formula).toBeUndefined();
  });
});

describe('getAllSignalKeys', () => {
  it('returns array of 18 keys', () => {
    const keys = getAllSignalKeys();
    expect(keys).toHaveLength(18);
  });

  it('includes all pillar signals', () => {
    const keys = getAllSignalKeys();
    expect(keys).toContain('vix');
    expect(keys).toContain('spyVs200MA');
    expect(keys).toContain('advanceDeclineRatio');
    expect(keys).toContain('yieldCurve10Y2Y');
    expect(keys).toContain('aaiiBulls');
    expect(keys).toContain('globalPMI');
  });
});
