import { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { saveReport, getReportByAnalysisId } from '../models/database';
import { ExpansionBrief } from '../types';

const router = Router();

/**
 * POST /api/reports
 * Generate and save an expansion brief
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { analysisId, businessObjective } = req.body;

  if (!analysisId) {
    throw new AppError(400, 'Analysis ID is required');
  }

  // Placeholder brief structure
  const brief: ExpansionBrief = {
    businessObjective: businessObjective || 'Evaluate expansion opportunity',
    targetCity: 'Unknown',
    concept: 'Unknown',
    evidenceSources: [],
    keyObservations: [],
    culturalSignals: [],
    potentialConcepts: [],
    assumptions: [],
    dataConfidence: {
      score: 0,
      explanation: 'Not generated',
      factors: {
        sourceQuality: 'Unknown',
        geographicMatch: 'Unknown',
        entityRelevance: 'Unknown',
        dataFreshness: 'Unknown',
        evidenceCompleteness: 'Unknown',
      },
    },
    geographicValidation: 'Not performed',
    riskAssessment: [],
    unresolvedQuestions: [],
    recommendedNextSteps: [],
    generatedAt: new Date().toISOString(),
  };

  // Save to database / memory
  try {
    await saveReport(brief, analysisId);
  } catch (dbError) {
    console.warn('Failed to save report to database:', dbError);
  }

  res.json({
    success: true,
    data: brief,
  });
}));

/**
 * GET /api/reports/analysis/:analysisId
 * Retrieve report for an analysis
 */
router.get('/analysis/:analysisId', asyncHandler(async (req: Request, res: Response) => {
  const { analysisId } = req.params;

  let report;
  try {
    report = await getReportByAnalysisId(analysisId);
  } catch (dbError) {
    console.error(`Database failure retrieving report for ${analysisId}:`, dbError);
    throw new AppError(500, 'Database error while retrieving report');
  }

  if (!report) {
    throw new AppError(404, 'Report not found');
  }

  res.json({
    success: true,
    data: report,
  });
}));

export { router as reportRouter };
