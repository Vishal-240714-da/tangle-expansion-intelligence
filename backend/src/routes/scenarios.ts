import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { scenarioService } from '../services/scenarioService';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { saveScenario, getScenariosByAnalysisId } from '../models/database';

const router = Router();

// Validation schema for scenario
const ScenarioSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Scenario name is required'),
  assumptions: z.object({
    budget: z.number().optional(),
    monthlyRent: z.number().optional(),
    menuPrices: z.number().optional(),
    staffingCosts: z.number().optional(),
    expectedFootfall: z.number().optional(),
    averageTransactionValue: z.number().optional(),
    ingredientCosts: z.number().optional(),
    marketingBudget: z.number().optional(),
    capacity: z.number().optional(),
    cafeConcept: z.string().optional(),
    targetAudience: z.string().optional(),
    geographicChoice: z.string().optional(),
  }),
});

/**
 * POST /api/scenarios
 * Create and calculate a scenario
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  let validatedData;
  try {
    validatedData = ScenarioSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }

  // Generate ID if not provided
  const scenarioId = validatedData.id || `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const scenario = {
    id: scenarioId,
    name: validatedData.name,
    assumptions: validatedData.assumptions,
  };

  // Calculate scenario
  const calculatedScenario = scenarioService.calculateScenario(scenario);

  // Save to database if analysisId is provided
  const { analysisId } = req.body;
  if (analysisId) {
    try {
      await saveScenario(calculatedScenario, analysisId);
    } catch (dbError) {
      console.warn('Failed to save scenario to database:', dbError);
    }
  }

  res.json({
    success: true,
    data: calculatedScenario,
  });
}));

/**
 * POST /api/scenarios/compare
 * Compare multiple scenarios
 */
router.post('/compare', asyncHandler(async (req: Request, res: Response) => {
  const { scenarios } = req.body;

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new AppError(400, 'Scenarios array is required');
  }

  const comparison = scenarioService.compareScenarios(scenarios);

  res.json({
    success: true,
    data: comparison,
  });
}));

/**
 * GET /api/scenarios/analysis/:analysisId
 * Retrieve all scenarios for an analysis
 */
router.get('/analysis/:analysisId', asyncHandler(async (req: Request, res: Response) => {
  const { analysisId } = req.params;

  let scenarios;
  try {
    scenarios = await getScenariosByAnalysisId(analysisId);
  } catch (dbError) {
    console.error(`Database failure retrieving scenarios for ${analysisId}:`, dbError);
    throw new AppError(500, 'Database error while retrieving scenarios');
  }

  res.json({
    success: true,
    data: scenarios,
  });
}));

export { router as scenarioRouter };
