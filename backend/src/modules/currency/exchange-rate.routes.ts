import { Router, Request, Response } from 'express';
import { getExchangeRates } from './exchange-rate.service.js';

const router = Router();

router.get('/exchange-rates', async (req: Request, res: Response) => {
  try {
    const rates = await getExchangeRates();
    res.json({ rates });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Error fetching exchange rates' });
  }
});

export default router;
