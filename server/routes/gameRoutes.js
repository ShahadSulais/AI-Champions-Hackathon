import express from 'express';
import { generateGameService, getLLMProviderInfo } from '../services/geminiService.js';
import { requestSchema } from '../schemas/gameSchema.js';

const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  const providerInfo = getLLMProviderInfo();
  res.json({
    status: 'ok',
    ...providerInfo
  });
});

// POST /api/games/generate
router.post('/games/generate', async (req, res, next) => {
  try {
    // Validate request body with Zod
    const validation = requestSchema.safeParse(req.body);
    if (!validation.success) {
      const errorMsg = (validation.error.issues || validation.error.errors || []).map(e => e.message).join(', ');
      return res.status(400).json({ error: `بيانات الطلب غير صالحة: ${errorMsg}` });
    }

    const { lessonTitle, studentLevel, lessonText, storyTheme, memory } = validation.data;

    const gameData = await generateGameService({
      lessonTitle,
      studentLevel,
      lessonText,
      storyTheme,
      memory
    });

    res.json(gameData);
  } catch (err) {
    next(err);
  }
});

export default router;
