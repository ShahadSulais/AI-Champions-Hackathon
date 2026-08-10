import express from 'express';
import { getAudioBase64 } from 'google-tts-api';
import { generateGameService, getLLMProviderInfo, extractTextFromImageService } from '../services/geminiService.js';
import { requestSchema } from '../schemas/gameSchema.js';

const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  const customProvider = req.headers['x-llm-provider'];
  const customApiKey = req.headers['x-gemini-key'] || req.headers['x-openrouter-key'];

  const providerInfo = getLLMProviderInfo(customProvider, customApiKey);
  const { resolvedApiKey, ...safeProviderInfo } = providerInfo;

  res.json({
    status: 'ok',
    ...safeProviderInfo
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

    const { lessonTitle, studentLevel, lessonText, storyTheme, memory, provider, apiKey } = validation.data;

    const customProvider = req.headers['x-llm-provider'] || provider;
    const customApiKey = req.headers['x-gemini-key'] || req.headers['x-openrouter-key'] || apiKey;

    const gameData = await generateGameService({
      lessonTitle,
      studentLevel,
      lessonText,
      storyTheme,
      memory,
      provider: customProvider,
      apiKey: customApiKey
    });

    res.json(gameData);
  } catch (err) {
    next(err);
  }
});

// POST /api/extract-text
router.post('/extract-text', async (req, res, next) => {
  try {
    const { imageBase64, mimeType, provider, apiKey } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'لم يتم تزويد بيانات الصورة (imageBase64).' });
    }

    const customProvider = req.headers['x-llm-provider'] || provider;
    const customApiKey = req.headers['x-gemini-key'] || req.headers['x-openrouter-key'] || apiKey;

    const extractedText = await extractTextFromImageService({
      base64Data: imageBase64,
      mimeType: mimeType || 'image/png',
      provider: customProvider,
      apiKey: customApiKey
    });

    res.json({ extractedText });
  } catch (err) {
    next(err);
  }
});

// GET /api/tts - High Quality Arabic Text-To-Speech audio stream
router.get('/tts', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text || typeof text !== 'string') {
      return res.status(400).send('Text parameter is required.');
    }

    const truncated = text.trim().slice(0, 250);
    const base64Audio = await getAudioBase64(truncated, {
      lang: 'ar',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });

    const buffer = Buffer.from(base64Audio, 'base64');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Server TTS Endpoint Error:', err);
    res.status(500).send('Server TTS Error.');
  }
});

export default router;

