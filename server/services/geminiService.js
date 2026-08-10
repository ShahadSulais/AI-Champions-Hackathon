import { GoogleGenAI } from '@google/genai';
import { buildGenerateGamePrompt } from '../prompts/generateGamePrompt.js';
import { gameOutputSchema } from '../schemas/gameSchema.js';

export function getLLMProviderInfo() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const preferredProvider = (process.env.LLM_PROVIDER || 'auto').toLowerCase();
  const isDemoMode = process.env.DEMO_MODE === 'true';

  const geminiConfigured = Boolean(geminiKey && geminiKey.trim().length > 0);
  const openrouterConfigured = Boolean(openrouterKey && openrouterKey.trim().length > 0);

  let activeProvider = 'none';

  if (preferredProvider === 'openrouter' && openrouterConfigured) {
    activeProvider = 'openrouter';
  } else if (preferredProvider === 'gemini' && geminiConfigured) {
    activeProvider = 'gemini';
  } else if (preferredProvider === 'auto') {
    if (openrouterConfigured) {
      activeProvider = 'openrouter';
    } else if (geminiConfigured) {
      activeProvider = 'gemini';
    } else if (isDemoMode) {
      activeProvider = 'demo';
    }
  } else if (isDemoMode) {
    activeProvider = 'demo';
  }

  const model = activeProvider === 'openrouter'
    ? (process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash')
    : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');

  return {
    activeProvider,
    geminiConfigured,
    openrouterConfigured,
    apiKeyConfigured: geminiConfigured || openrouterConfigured,
    model,
    demoMode: isDemoMode
  };
}

export async function generateGameService({ lessonTitle, studentLevel, lessonText, storyTheme, memory }) {
  const providerInfo = getLLMProviderInfo();
  const { activeProvider, demoMode } = providerInfo;

  if (activeProvider === 'none') {
    throw new Error('لم يتم تكوين أي مفتاح API (GEMINI_API_KEY أو OPENROUTER_API_KEY) على الخادم. يرجى ضبط المفتاح في ملف .env');
  }

  if (activeProvider === 'demo') {
    console.warn('⚠️ [DEMO_MODE] No API keys configured. Returning demo game fallback.');
    return getDemoFallbackGame(lessonTitle, storyTheme, memory);
  }

  const promptText = buildGenerateGamePrompt({ lessonTitle, studentLevel, lessonText, storyTheme, memory });

  try {
    let rawText = '';

    if (activeProvider === 'openrouter') {
      console.log(` Calling OpenRouter API using model: ${providerInfo.model}`);
      rawText = await callOpenRouterAPI(promptText, providerInfo.model);
    } else if (activeProvider === 'gemini') {
      console.log(` Calling Google Gemini API using model: ${providerInfo.model}`);
      rawText = await callGeminiAPI(promptText, providerInfo.model);
    }

    if (!rawText) {
      throw new Error('تلقى الخادم استجابة فارغة من المحرك الذكي.');
    }

    // Advanced JSON Extraction & Sanitization
    const parsedJson = extractAndParseJSON(rawText);

    // Normalize raw game object to ensure robust key structures
    const normalizedJson = normalizeRawGameObject(parsedJson);

    // Validate normalized game object against Zod schema
    const validationResult = gameOutputSchema.safeParse(normalizedJson);

    if (!validationResult.success) {
      const issues = validationResult.error.issues || validationResult.error.errors || [];
      const errMsgs = issues.length > 0 ? issues.map(e => e.message).join('; ') : validationResult.error.message;
      console.warn('Validation Warning (auto-fixing):', errMsgs);
    }

    return normalizedJson;

  } catch (err) {
    console.error(`LLM Service Error (${activeProvider}):`, err.message);

    if (demoMode) {
      console.warn('⚠️ [DEMO_MODE] Call failed. Falling back to demo game due to DEMO_MODE=true.');
      return getDemoFallbackGame(lessonTitle, storyTheme, memory);
    }

    throw new Error(err.message || 'حدث خطأ غير متوقع أثناء التواصل مع المحرك الذكي.');
  }
}

// Robust Normalizer for Model Game Outputs
function normalizeRawGameObject(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const gameTitle = raw.gameTitle || raw.title || 'مغامرة المعرفة';
  const introduction = raw.introduction || raw.intro || raw.story || 'مرحباً بك في المغامرة التعليمية!';
  const mission = raw.mission || raw.goal || 'استكشاف المفاهيم واجتياز التحديات.';

  const character = {
    name: raw.character?.name || raw.guide?.name || 'المرشد العلمي',
    description: raw.character?.description || raw.guide?.description || 'مساعدك في المغامرة',
    dialogue: raw.character?.dialogue || raw.guide?.dialogue || 'أهلاً بك يا بطل المعرفة!'
  };

  let concepts = Array.isArray(raw.concepts) ? raw.concepts : [];
  if (concepts.length === 0) {
    concepts = [
      { id: 'c1', name: 'المفهوم الأول', explanation: 'الشرح الأول' },
      { id: 'c2', name: 'المفهوم الثاني', explanation: 'الشرح الثاني' },
      { id: 'c3', name: 'المفهوم الثالث', explanation: 'الشرح الثالث' }
    ];
  }
  concepts = concepts.map((c, i) => ({
    id: String(c.id || `c${i + 1}`),
    name: String(c.name || c.title || `المفهوم ${i + 1}`),
    explanation: String(c.explanation || c.desc || '')
  })).slice(0, 3);

  while (concepts.length < 3) {
    concepts.push({ id: `c${concepts.length + 1}`, name: `المفهوم ${concepts.length + 1}`, explanation: '' });
  }

  const validConceptIds = new Set(concepts.map(c => c.id));
  let scenes = Array.isArray(raw.scenes) ? raw.scenes : [];
  const requiredTypes = ['classification', 'ordering', 'written_answer'];

  scenes = scenes.map((s, i) => {
    const gameType = requiredTypes[i] || s.gameType || 'written_answer';
    const conceptId = validConceptIds.has(s.conceptId) ? s.conceptId : concepts[i % concepts.length].id;
    let challenge = s.challenge || {};

    if (gameType === 'classification') {
      let categories = Array.isArray(challenge.categories) ? challenge.categories : [];
      if (categories.length < 2) {
        categories = [
          { id: 'cat1', label: 'المجموعة الأولى' },
          { id: 'cat2', label: 'المجموعة الثانية' }
        ];
      }
      categories = categories.map((cat, ci) => ({
        id: String(cat.id || `cat${ci + 1}`),
        label: String(cat.label || cat.name || cat.title || `الفئة ${ci + 1}`)
      }));

      const catIds = new Set(categories.map(c => c.id));
      const fallbackCat = categories[0].id;

      let items = Array.isArray(challenge.items) ? challenge.items : [];
      items = items.map((item, ii) => {
        const cat = item.correctCategory || item.category || item.categoryId;
        return {
          id: String(item.id || `i${ii + 1}`),
          text: String(item.text || item.name || `عنصر ${ii + 1}`),
          correctCategory: catIds.has(cat) ? String(cat) : fallbackCat
        };
      });

      challenge = { categories, items };

    } else if (gameType === 'ordering') {
      let steps = Array.isArray(challenge.steps) ? challenge.steps : [];
      steps = steps.map((st, si) => ({
        id: String(st.id || `st${si + 1}`),
        text: String(st.text || st.step || st.title || `الخطوة ${si + 1}`),
        correctOrder: typeof st.correctOrder === 'number' ? st.correctOrder : (st.order || si + 1)
      }));
      challenge = { steps };

    } else if (gameType === 'written_answer') {
      challenge = {
        question: String(challenge.question || s.question || 'ما هي الفكرة الرئيسية للدرس؟'),
        expectedAnswer: String(challenge.expectedAnswer || challenge.answer || 'الإجابة العلمية الجوهرية'),
        keywords: Array.isArray(challenge.keywords) ? challenge.keywords.map(String) : []
      };
    }

    return {
      id: String(s.id || `s${i + 1}`),
      title: String(s.title || `المشهد ${i + 1}`),
      narration: String(s.narration || s.story || ''),
      visualDescription: String(s.visualDescription || s.visual || ''),
      conceptId,
      gameType,
      challenge,
      hint: String(s.hint || 'راجع تفاصيل الدرس.'),
      successNarration: String(s.successNarration || 'إجابة ممتازة!'),
      supportNarration: String(s.supportNarration || 'حاول مرة أخرى.')
    };
  });

  while (scenes.length < 3) {
    const idx = scenes.length;
    scenes.push({
      id: `s${idx + 1}`,
      title: `المشهد ${idx + 1}`,
      narration: 'استكمل المهمة لتجاوز هذا التحدي.',
      visualDescription: '',
      conceptId: concepts[idx % concepts.length].id,
      gameType: requiredTypes[idx],
      challenge: requiredTypes[idx] === 'classification'
        ? { categories: [{ id: 'cat1', label: 'الفئة 1' }, { id: 'cat2', label: 'الفئة 2' }], items: [{ id: 'i1', text: 'عنصر 1', correctCategory: 'cat1' }] }
        : requiredTypes[idx] === 'ordering'
        ? { steps: [{ id: 'st1', text: 'خطوة 1', correctOrder: 1 }, { id: 'st2', text: 'خطوة 2', correctOrder: 2 }] }
        : { question: 'ما النتيجة العلمية للدرس؟', expectedAnswer: 'النتيجة العلمية' },
      hint: 'راجع نص الدرس.',
      successNarration: 'إجابة صحيحة!',
      supportNarration: 'حاول مرة أخرى.'
    });
  }

  scenes[0].gameType = 'classification';
  scenes[1].gameType = 'ordering';
  scenes[2].gameType = 'written_answer';

  const misconception = {
    statement: String(raw.misconception?.statement || ''),
    correction: String(raw.misconception?.correction || ''),
    conceptId: concepts[0].id
  };

  const teacherKey = Array.isArray(raw.teacherKey)
    ? raw.teacherKey.map(k => ({ concept: String(k.concept || ''), evaluationCriteria: String(k.evaluationCriteria || '') }))
    : [{ concept: concepts[0].name, evaluationCriteria: 'استيعاب مفاهيم الدرس' }];

  return {
    gameTitle,
    introduction,
    mission,
    character,
    concepts,
    scenes,
    misconception,
    ending: String(raw.ending || 'أحسنت! أتممت المغامرة بنجاح.'),
    teacherKey
  };
}

// Robust JSON Extraction and Sanitizer Helper
function extractAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('تلقى الخادم استجابة فارغة من المحرك الذكي.');
  }

  let text = rawText.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(text);
  } catch (e1) {
    // Continue
  }

  // 2. Extract content from markdown code fences ```json ... ``` anywhere in text
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim();
    try {
      return JSON.parse(extracted);
    } catch (e2) {
      text = extracted;
    }
  }

  // 3. Extract JSON object from first '{' to last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = text.substring(firstBrace, lastBrace + 1).trim();
    try {
      return JSON.parse(jsonSub);
    } catch (e3) {
      // 4. Sanitize unescaped newlines/tabs inside string literals
      const sanitized = jsonSub.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        return match
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      });
      try {
        return JSON.parse(sanitized);
      } catch (e4) {
        // Continue
      }
    }
  }

  throw new Error('تنسيق الاستجابة الصادرة من المحرك الذكي غير صالح كـ JSON.');
}

// OpenRouter API Call Handler
async function callOpenRouterAPI(promptText, modelName) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Knowledge Guardians'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: 'أنت مصمم ألعاب تعليمية وتفاعلية باللغة العربية. أرجع كائن JSON فقط مطابق للهيكل المطلوب بالضبط. تمنع أي كتابة أو شرح أو مقدمات خارج كائن الـ JSON.'
          },
          {
            role: 'user',
            content: promptText
          }
        ],
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `خطأ في الاتصال بـ OpenRouter API (رمز ${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بـ OpenRouter API (60 ثانية).');
    }
    throw err;
  }
}

// Google Gemini API Call Handler
async function callGeminiAPI(promptText, modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4000
      }
    });

    clearTimeout(timeoutId);
    return response.text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بـ Gemini API (60 ثانية).');
    }
    throw err;
  }
}

function getDemoFallbackGame(title, theme, memory) {
  const hasStruggles = memory && Array.isArray(memory.struggleAreas) && memory.struggleAreas.length > 0;
  const extraNote = hasStruggles ? ` (توضيحي: النمط التجريبي DEMO_MODE)` : ` (تجريبي)`;

  return {
    gameTitle: "مغامرة " + (title || "الدرس") + " في " + (theme || "مدينة مستقبلية") + extraNote,
    introduction: "في عوالم " + (theme || "مدينة مستقبلية") + "، يتعلم البطل المفاهيم الأساسية للدرس في نمط العرض التجريبي.",
    mission: "استكشاف العناصر والترتيب والإجابة عن السؤال لإعادة التوازن.",
    character: {
      name: "المرشد التجريبي",
      description: "مساعد البطل في النمط التجريبي.",
      dialogue: "أهلاً بك في النمط التجريبي للعبة حُرّاس المعرفة!"
    },
    concepts: [
      { id: "c1", name: "المفهوم الأساسي 1", explanation: "العنصر الأول في الدرس" },
      { id: "c2", name: "سلسلة الخطوات", explanation: "التسلسل العلمي للخطوات" },
      { id: "c3", name: "النتيجة الجوهرية", explanation: "الاستنتاج الرئيسي" }
    ],
    scenes: [
      {
        id: "s1",
        title: "المشهد الأول: تصنيف المفاهيم",
        narration: "قم بتصنيف العناصر التالية بحسب مجموعاتها المناسبة.",
        visualDescription: "مختبر رمزي لتصنيف العناصر",
        conceptId: "c1",
        gameType: "classification",
        challenge: {
          categories: [
            { id: "cat1", label: "المجموعة الأولى" },
            { id: "cat2", label: "المجموعة الثانية" }
          ],
          items: [
            { id: "i1", text: "عنصر مدخل 1", correctCategory: "cat1" },
            { id: "i2", text: "عنصر مدخل 2", correctCategory: "cat1" },
            { id: "i3", text: "عنصر مخرج 1", correctCategory: "cat2" },
            { id: "i4", text: "عنصر مخرج 2", correctCategory: "cat2" }
          ]
        },
        hint: "ركز على طبيعة مدخلات ومخرجات الدرس.",
        successNarration: "تصنيف ممتاز ودقيق!",
        supportNarration: "حاول مرة أخرى والتحقق من الفئات."
      },
      {
        id: "s2",
        title: "المشهد الثاني: ترتيب التسلسل",
        narration: "رتب الخطوات المتتالية للعملية العلمية.",
        visualDescription: "مسار زمني تفاعلي",
        conceptId: "c2",
        gameType: "ordering",
        challenge: {
          steps: [
            { id: "st1", text: "الخطوة الأولى", correctOrder: 1 },
            { id: "st2", text: "الخطوة الثانية", correctOrder: 2 },
            { id: "st3", text: "الخطوة الثالثة", correctOrder: 3 },
            { id: "st4", text: "الخطوة الرابعة", correctOrder: 4 }
          ]
        },
        hint: "ابدأ بالخطوة التمهيدية الأولى.",
        successNarration: "ترتيب صحيح ومتسلسل!",
        supportNarration: "تذكر الترتيب المنطقي للخطوات."
      },
      {
        id: "s3",
        title: "المشهد الثالث: السؤال التقييمي",
        narration: "أجب عن السؤال الختامي لتأكيد الاستيعاب.",
        visualDescription: "قاعة الاختبارات التفاعلية",
        conceptId: "c3",
        gameType: "written_answer",
        challenge: {
          question: "ما الفكرة الأساسية المكتسبة من هذا الدرس؟",
          expectedAnswer: "الفهم العلمي الجوهري"
        },
        hint: "اكتب ملخصاً موجزاً للفكرة الجوهرية.",
        successNarration: "إجابة رائعة وموفقة!",
        supportNarration: "راجع النقطة الجوهرية للدرس."
      }
    ],
    misconception: {
      statement: "الظواهر العلمية تحدث دون أسباب محددة.",
      correction: "كل ظاهرة تتبع خطوات وقواعد علمية دقيقة.",
      conceptId: "c1"
    },
    ending: "أحسنت! أتممت المغامرة بنجاح في نمط العرض التجريبي.",
    teacherKey: [
      { concept: "الفهم العام", evaluationCriteria: "استيعاب الخطوات والمفاهيم" }
    ]
  };
}
