import { Scenario, ScenarioCalculations, FinancialAssumptions } from '../types';

/**
 * Scenario Service handles what-if scenario calculations
 * All calculations are transparent and clearly distinguish assumptions from facts
 */
export class ScenarioService {
  /**
   * Calculate financial metrics for a scenario
   */
  calculateScenario(scenario: Scenario): Scenario {
    const assumptions = scenario.assumptions;
    const calculations = this.performCalculations(assumptions);

    return {
      ...scenario,
      calculations,
    };
  }

  /**
   * Perform transparent financial calculations
   * All assumptions are made explicit
   */
  private performCalculations(assumptions: FinancialAssumptions): ScenarioCalculations {
    const missingInputs: string[] = [];

    // Check for required inputs
    if (!assumptions.expectedFootfall) missingInputs.push('expectedFootfall');
    if (!assumptions.averageTransactionValue) missingInputs.push('averageTransactionValue');
    if (!assumptions.monthlyRent) missingInputs.push('monthlyRent');
    if (!assumptions.staffingCosts) missingInputs.push('staffingCosts');
    if (!assumptions.ingredientCosts) missingInputs.push('ingredientCosts');

    // If critical inputs are missing, return incomplete calculations
    if (missingInputs.length > 0) {
      return {
        estimatedMonthlyRevenue: 0,
        operatingExpenses: 0,
        contributionMargin: 0,
        breakEvenMonths: 0,
        assumptions: [
          `Missing required inputs: ${missingInputs.join(', ')}`,
          'Cannot perform financial calculations without complete assumptions',
        ],
      };
    }

    // Calculate estimated monthly revenue
    const estimatedMonthlyRevenue =
      (assumptions.expectedFootfall! * assumptions.averageTransactionValue!) * 30; // 30 days

    // Calculate operating expenses
    const operatingExpenses =
      (assumptions.monthlyRent || 0) +
      (assumptions.staffingCosts || 0) +
      (assumptions.ingredientCosts || 0) +
      (assumptions.marketingBudget || 0);

    // Calculate contribution margin (revenue - all operating costs)
    // Note: ingredientCosts is already included in operatingExpenses above;
    // we do NOT subtract it again to avoid double-counting.
    const contributionMargin = estimatedMonthlyRevenue - operatingExpenses;

    // Calculate break-even months (if budget provided)
    const breakEvenMonths = assumptions.budget && contributionMargin > 0
      ? Math.ceil(assumptions.budget / contributionMargin)
      : 0;

    return {
      estimatedMonthlyRevenue,
      operatingExpenses,
      contributionMargin,
      breakEvenMonths,
      assumptions: [
        'Inputs are user-provided assumptions; calculations are scenario arithmetic, not a market forecast.',
        `Daily footfall: ${assumptions.expectedFootfall}`,
        `Average transaction value: ${assumptions.averageTransactionValue}`,
        `Monthly rent: ${assumptions.monthlyRent}`,
        `Monthly staffing costs: ${assumptions.staffingCosts}`,
        `Monthly ingredient costs: ${assumptions.ingredientCosts}`,
        `Marketing budget: ${assumptions.marketingBudget || 0}`,
        'Calculations assume 30 operating days per month',
        'Utilities, taxes, maintenance, and other unentered costs are excluded',
      ],
    };
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(scenarios: Scenario[]): {
    scenarios: Scenario[];
    comparison: {
      evidenceCoverage: Record<string, number>;
      geographicMatch: Record<string, string>;
      dataConfidence: Record<string, number>;
      risks: Record<string, number>;
    };
    recommendedNextSteps: string[];
  } {
    const calculatedScenarios = scenarios.map(s => this.calculateScenario(s));

    const comparison = {
      evidenceCoverage: {} as Record<string, number>,
      geographicMatch: {} as Record<string, string>,
      dataConfidence: {} as Record<string, number>,
      risks: {} as Record<string, number>,
    };

    calculatedScenarios.forEach(scenario => {
      comparison.evidenceCoverage[scenario.name] = 0; // Would be populated with actual evidence
      comparison.geographicMatch[scenario.name] = 'unknown';
      comparison.dataConfidence[scenario.name] = 0;
      comparison.risks[scenario.name] = 0;
    });

    const recommendedNextSteps = [
      'Provide evidence data for each scenario to enable meaningful comparison',
      'Validate financial assumptions with local market research',
      'Compare calculated break-even points against realistic timelines',
      'Conduct sensitivity analysis on key assumptions',
    ];

    return {
      scenarios: calculatedScenarios,
      comparison,
      recommendedNextSteps,
    };
  }
}

export const scenarioService = new ScenarioService();
