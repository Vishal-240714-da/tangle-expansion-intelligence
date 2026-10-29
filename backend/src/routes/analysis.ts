import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { analysisService } from '../services/analysisService';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { saveAnalysis, getAnalysis, getEvidenceByAnalysisId } from '../models/database';

const router = Router();

// Validation schema for analysis request
const AnalysisRequestSchema = z.object({
  brandName: z.string().optional(),
  targetCity: z.string().min(1, 'Target city is required'),
  businessCategory: z.string().optional(),
  cafeConcept: z.string().optional(),
  targetAudience: z.string().optional(),
  menuDirection: z.string().optional(),
  experienceStrategy: z.string().optional(),
  geographicScope: z.enum(['city', 'neighborhood']).default('city'),
  dataMode: z.enum(['live', 'demo']).default('live'),
  bypassCache: z.boolean().optional(),
  budgetAssumptions: z.object({
    budget: z.number().optional(),
    monthlyRent: z.number().optional(),
    menuPrices: z.number().optional(),
    staffingCosts: z.number().optional(),
    expectedFootfall: z.number().optional(),
    averageTransactionValue: z.number().optional(),
    ingredientCosts: z.number().optional(),
    marketingBudget: z.number().optional(),
    capacity: z.number().optional(),
  }).optional(),
  userAssumptions: z.record(z.any()).optional(),
});

/**
 * POST /api/analysis
 * Perform expansion analysis
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  let validatedData;
  try {
    validatedData = AnalysisRequestSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }

  // Perform analysis
  const result = await analysisService.performAnalysis(validatedData);

  // Save to database / in-memory store
  try {
    await saveAnalysis(result);
  } catch (dbError) {
    console.warn('Failed to save analysis to database:', dbError);
    // In-memory store was updated inside saveAnalysis; continue
  }

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/analysis/:id
 * Retrieve a specific analysis
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  let analysis;
  try {
    analysis = await getAnalysis(id);
  } catch (dbError) {
    console.error(`Database failure retrieving analysis ${id}:`, dbError);
    throw new AppError(500, 'Database error while retrieving analysis');
  }

  if (!analysis) {
    throw new AppError(404, 'Analysis not found');
  }

  // Retrieve evidence for this analysis
  let evidence: any[] = [];
  try {
    evidence = await getEvidenceByAnalysisId(id);
  } catch (dbError) {
    console.error(`Database failure retrieving evidence for analysis ${id}:`, dbError);
    throw new AppError(500, 'Database error while retrieving analysis evidence');
  }

  const result = {
    ...analysis,
    evidence: Array.isArray(analysis.evidence) && analysis.evidence.length > 0 ? analysis.evidence : evidence,
  };

  res.json({
    success: true,
    data: result,
  });
}));

export { router as analysisRouter };
