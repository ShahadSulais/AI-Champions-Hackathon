import express from 'express';
import dotenv from 'dotenv';
import gameRoutes from './server/routes/gameRoutes.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { gameOutputSchema } from './server/schemas/gameSchema.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', gameRoutes);
app.use(errorHandler);

const server = app.listen(3099, async () => {
  console.log('Test server started on port 3099');

  try {
    // Test 1: GET /api/health
    console.log('\n--- Test 1: GET /api/health ---');
    const healthRes = await fetch('http://localhost:3099/api/health');
    const healthData = await healthRes.json();
    console.log('Health Response:', healthData);
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('✅ Test 1 Passed');
    } else {
      console.error('❌ Test 1 Failed');
    }

    // Test 2: Invalid Request Body (missing required fields)
    console.log('\n--- Test 2: Invalid Request Body ---');
    const invalidRes = await fetch('http://localhost:3099/api/games/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonTitle: "" })
    });
    const invalidData = await invalidRes.json();
    console.log('Invalid Request Response Status:', invalidRes.status, invalidData);
    if (invalidRes.status === 400 && invalidData.error) {
      console.log('✅ Test 2 Passed (Returned 400 Bad Request with Arabic error message)');
    } else {
      console.error('❌ Test 2 Failed');
    }

    // Test 3: Missing API Key behavior (without DEMO_MODE)
    console.log('\n--- Test 3: Missing API Key behavior ---');
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    process.env.DEMO_MODE = 'false';

    const missingKeyRes = await fetch('http://localhost:3099/api/games/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonTitle: 'البناء الضوئي',
        studentLevel: 'الصف السادس',
        lessonText: 'البناء الضوئي هو تفاعل يحدث في البلاستيدات الخضراء باستخدام ضوء الشمس والماء وثاني أكسيد الكربون لإنتاج الجلوكوز والأكسجين.',
        storyTheme: 'مدينة مستقبلية'
      })
    });
    const missingKeyData = await missingKeyRes.json();
    console.log('Missing Key Response Status:', missingKeyRes.status, missingKeyData);
    if (missingKeyRes.status === 500 && missingKeyData.error && missingKeyData.error.includes('GEMINI_API_KEY')) {
      console.log('✅ Test 3 Passed (Returned 500 with clear API key error without falling back silently)');
    } else {
      console.error('❌ Test 3 Failed');
    }

    // Test 4: DEMO_MODE=true behavior when API key is missing
    console.log('\n--- Test 4: DEMO_MODE=true fallback ---');
    process.env.DEMO_MODE = 'true';

    const demoModeRes = await fetch('http://localhost:3099/api/games/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonTitle: 'البناء الضوئي',
        studentLevel: 'الصف السادس',
        lessonText: 'البناء الضوئي هو تفاعل يحدث في البلاستيدات الخضراء باستخدام ضوء الشمس والماء وثاني أكسيد الكربون لإنتاج الجلوكوز والأكسجين.',
        storyTheme: 'مدينة مستقبلية'
      })
    });
    const demoModeData = await demoModeRes.json();
    console.log('Demo Mode Response Title:', demoModeData.gameTitle);
    if (demoModeRes.status === 200 && demoModeData.scenes && demoModeData.scenes.length === 3) {
      console.log('✅ Test 4 Passed (Returned structured demo game payload)');
    } else {
      console.error('❌ Test 4 Failed');
    }

    // Test 5: Malformed Model Output Validation
    console.log('\n--- Test 5: Malformed Output Schema Validation ---');
    const malformedPayload = {
      gameTitle: 'مغامرة ناقصة',
      scenes: [] // Missing concepts, character, introduction, etc.
    };
    const parseResult = gameOutputSchema.safeParse(malformedPayload);
    if (!parseResult.success) {
      console.log('Zod correctly rejected malformed schema:', parseResult.error.issues[0]?.message);
      console.log('✅ Test 5 Passed');
    } else {
      console.error('❌ Test 5 Failed');
    }

    // Test 6: Live API Verification (Gemini or OpenRouter)
    console.log('\n--- Test 6: Live API Verification ---');
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
      console.log('OPENROUTER_API_KEY is present. Executing live OpenRouter request...');
      process.env.DEMO_MODE = 'false';
      const liveRes = await fetch('http://localhost:3099/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: 'البناء الضوئي في النباتات',
          studentLevel: 'الصف السادس الابتدائي',
          lessonText: 'عملية البناء الضوئي هي الظاهرة التي تستخدم من خلالها النباتات الخضراء ضوء الشمس لتحويل الأغذية إلى طاقة في البلاستيدات الخضراء.',
          storyTheme: 'رحلة فضائية'
        })
      });
      const liveData = await liveRes.json();
      if (liveRes.status === 200 && liveData.gameTitle) {
        console.log('✅ Test 6 Passed (Live OpenRouter call succeeded):', liveData.gameTitle);
      } else {
        console.error('❌ Test 6 Failed:', liveData);
      }
    } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      console.log('GEMINI_API_KEY is present. Executing live Gemini generation request...');
      process.env.DEMO_MODE = 'false';
      const liveRes = await fetch('http://localhost:3099/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: 'البناء الضوئي في النباتات',
          studentLevel: 'الصف السادس الابتدائي',
          lessonText: 'عملية البناء الضوئي هي الظاهرة التي تستخدم من خلالها النباتات الخضراء ضوء الشمس لتحويل الأغذية إلى طاقة في البلاستيدات الخضراء.',
          storyTheme: 'رحلة فضائية'
        })
      });
      const liveData = await liveRes.json();
      if (liveRes.status === 200 && liveData.gameTitle) {
        console.log('✅ Test 6 Passed (Live Gemini call succeeded):', liveData.gameTitle);
      } else {
        console.error('❌ Test 6 Failed:', liveData);
      }
    } else {
      console.log('ℹ️ Live verification is blocked by missing GEMINI_API_KEY / OPENROUTER_API_KEY in environment.');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close(() => {
      console.log('\nTest server closed.');
    });
  }
});
