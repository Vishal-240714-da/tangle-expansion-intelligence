import { scenarioService } from '../../services/scenarioService';
import { Scenario } from '../../types';

describe('ScenarioService — Financial Calculations & What-If Unit Economics', () => {
  it('calculates monthly revenue, operating expenses, and contribution margin correctly', () => {
    const scenario: Scenario = {
      id: 'scenario-test-1',
      name: 'Baseline Café Model',
      assumptions: {
        expectedFootfall: 100,
        averageTransactionValue: 300,
        monthlyRent: 50000,
        staffingCosts: 60000,
        ingredientCosts: 70000,
        marketingBudget: 10000,
        budget: 400000,
      },
    };

    const result = scenarioService.calculateScenario(scenario);
    const calc = result.calculations;
    expect(calc).toBeDefined();

    // 1. Revenue: 100 guests * 300 ATV * 30 days = 900,000
    expect(calc!.estimatedMonthlyRevenue).toBe(900000);

    // Operating expenses include entered costs only; unentered overhead is excluded.
    expect(calc!.operatingExpenses).toBe(190000);

    // 3. Contribution Margin: Revenue (900,000) - entered Operating Expenses (190,000) = 710,000
    // INGREDIENTS MUST BE COUNTED EXACTLY ONCE (NOT DOUBLE-SUBTRACTED)
    expect(calc!.contributionMargin).toBe(710000);

    // 4. Break-Even / Payback: Math.ceil(400,000 / 710,000) = 1 month
    expect(calc!.breakEvenMonths).toBe(1);
    expect(calc!.assumptions).toContain('Inputs are user-provided assumptions; calculations are scenario arithmetic, not a market forecast.');
  });

  it('ensures ingredient costs are never double-subtracted from contribution margin', () => {
    const scenario: Scenario = {
      id: 'scenario-ingredient-check',
      name: 'Ingredient Single-Count Check',
      assumptions: {
        expectedFootfall: 100,
        averageTransactionValue: 200, // Revenue = 600,000
        monthlyRent: 100000,
        staffingCosts: 100000,
        ingredientCosts: 150000, // Large ingredient cost
        marketingBudget: 0,
        budget: 500000,
      },
    };

    const result = scenarioService.calculateScenario(scenario);
    const calc = result.calculations!;

    // Total entered operating expenses = 100k + 100k + 150k = 350,000
    expect(calc.operatingExpenses).toBe(350000);

    // With entered costs counted once, margin = 600k - 350k = 250,000
    expect(calc.contributionMargin).toBe(250000);
    expect(calc.breakEvenMonths).toBe(Math.ceil(500000 / 250000)); // 2 months
  });

  it('returns safe fallback calculations when critical inputs are missing', () => {
    const incompleteScenario: Scenario = {
      id: 'scenario-incomplete',
      name: 'Missing Inputs Scenario',
      assumptions: {
        expectedFootfall: 50,
        // averageTransactionValue, monthlyRent, staffingCosts, ingredientCosts missing
      },
    };

    const result = scenarioService.calculateScenario(incompleteScenario);
    const calc = result.calculations!;

    expect(calc.estimatedMonthlyRevenue).toBe(0);
    expect(calc.operatingExpenses).toBe(0);
    expect(calc.contributionMargin).toBe(0);
    expect(calc.breakEvenMonths).toBe(0);
    expect(calc.assumptions[0]).toContain('Missing required inputs');
  });

  it('handles zero or negative contribution margin safely without dividing by zero or negative payback', () => {
    const lossScenario: Scenario = {
      id: 'scenario-loss',
      name: 'Unprofitable Scenario',
      assumptions: {
        expectedFootfall: 10,
        averageTransactionValue: 50, // Revenue = 15,000
        monthlyRent: 100000,
        staffingCosts: 80000,
        ingredientCosts: 50000,
        marketingBudget: 10000,
        budget: 300000,
      },
    };

    const result = scenarioService.calculateScenario(lossScenario);
    const calc = result.calculations!;

    expect(calc.contributionMargin).toBeLessThan(0);
    expect(calc.breakEvenMonths).toBe(0); // Safely sets payback to 0 when operating at a loss
  });

  it('compares multiple scenarios and produces comparison metrics', () => {
    const s1: Scenario = {
      id: 's-1',
      name: 'Scenario 1',
      assumptions: {
        expectedFootfall: 100,
        averageTransactionValue: 250,
        monthlyRent: 40000,
        staffingCosts: 50000,
        ingredientCosts: 60000,
      },
    };

    const s2: Scenario = {
      id: 's-2',
      name: 'Scenario 2',
      assumptions: {
        expectedFootfall: 150,
        averageTransactionValue: 350,
        monthlyRent: 60000,
        staffingCosts: 70000,
        ingredientCosts: 80000,
      },
    };

    const comparison = scenarioService.compareScenarios([s1, s2]);
    expect(comparison.scenarios.length).toBe(2);
    expect(comparison.scenarios[0].calculations).toBeDefined();
    expect(comparison.scenarios[1].calculations).toBeDefined();
    expect(comparison.recommendedNextSteps.length).toBeGreaterThan(0);
  });
});
