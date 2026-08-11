import express from 'express';
import { getAudioBase64 } from 'google-tts-api';
import { generateGameService, generateRealmsGameService, getLLMProviderInfo, extractTextFromImageService } from '../services/geminiService.js';
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

// POST /api/games/generate-realms
router.post('/games/generate-realms', async (req, res, next) => {
  try {
    const validation = requestSchema.safeParse(req.body);
    if (!validation.success) {
      const errorMsg = (validation.error.issues || validation.error.errors || []).map(e => e.message).join(', ');
      return res.status(400).json({ error: `بيانات الطلب غير صالحة: ${errorMsg}` });
    }

    const { lessonTitle, studentLevel, lessonText, storyTheme, memory, provider, apiKey } = validation.data;

    const customProvider = req.headers['x-llm-provider'] || provider;
    const customApiKey = req.headers['x-gemini-key'] || req.headers['x-openrouter-key'] || apiKey;

    const realmsData = await generateRealmsGameService({
      lessonTitle,
      studentLevel,
      lessonText,
      storyTheme,
      memory,
      provider: customProvider,
      apiKey: customApiKey
    });

    res.json(realmsData);
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

function sanitizeTextForTTS(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '')
    .replace(/[^\p{L}\p{N}\s.,?!،؟-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// OPTIONS /api/tts CORS preflight
router.options('/tts', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});

// GET /api/tts - High Quality Arabic Text-To-Speech audio stream
router.get('/tts', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  try {
    const rawText = req.query.text;
    const cleanText = sanitizeTextForTTS(rawText);
    if (!cleanText) {
      return res.status(400).send('Valid text parameter is required.');
    }

    const truncated = cleanText.slice(0, 200);
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

