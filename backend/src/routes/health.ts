import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TANGLE Expansion Intelligence Backend',
    version: '1.0.0',
  });
});

export { router as healthRouter };
