import { z } from 'zod';

export const requestSchema = z.object({
  lessonTitle: z.string().min(1, 'عنوان الدرس مطلوب').max(200, 'عنوان الدرس طويل جداً'),
  studentLevel: z.string().min(1, 'المستوى التعليمي مطلوب').max(200, 'المستوى التعليمي طويل جداً'),
  lessonText: z.string().min(10, 'نص الدرس قصير جداً').max(10000, 'نص الدرس طويل جداً (الحد الأقصى 10,000 حرف)'),
  storyTheme: z.string().min(1, 'السمة القصصية مطلوبة').max(100),
  provider: z.enum(['auto', 'gemini', 'openrouter']).optional(),
  apiKey: z.string().optional(),
  memory: z.object({
    sessionsCount: z.number().optional(),
    profileSummary: z.string().optional(),
    recentConcepts: z.array(z.string()).optional(),
    struggleAreas: z.array(z.string()).optional(),
    timeline: z.array(z.any()).optional()
  }).passthrough().optional()
});

export const conceptSchema = z.object({
  id: z.string().default('c1'),
  name: z.string(),
  explanation: z.string()
});

export const classificationCategorySchema = z.object({
  id: z.string().default('cat1'),
  label: z.string()
});

export const classificationItemSchema = z.object({
  id: z.string().default('i1'),
  text: z.string(),
  correctCategory: z.string()
});

export const classificationChallengeSchema = z.object({
  categories: z.array(classificationCategorySchema).min(2),
  items: z.array(classificationItemSchema).min(3)
});

export const orderingStepSchema = z.object({
  id: z.string().default('st1'),
  text: z.string(),
  correctOrder: z.number()
});

export const orderingChallengeSchema = z.object({
  steps: z.array(orderingStepSchema).min(3)
});

export const writtenAnswerChallengeSchema = z.object({
  question: z.string(),
  expectedAnswer: z.string(),
  keywords: z.array(z.string()).optional()
});

export const sceneSchema = z.object({
  id: z.string().default('s1'),
  title: z.string(),
  narration: z.string(),
  visualDescription: z.string().optional().default(''),
  conceptId: z.string().default('c1'),
  gameType: z.enum(['classification', 'ordering', 'written_answer']),
  challenge: z.any(),
  hint: z.string().default('راجع تفاصيل الدرس.'),
  successNarration: z.string().default('أحسنت! إجابة صحيحة.'),
  supportNarration: z.string().default('حاول مرة أخرى.')
});

export const gameOutputSchema = z.object({
  gameTitle: z.string(),
  introduction: z.string(),
  mission: z.string(),
  character: z.object({
    name: z.string().default('المرشد'),
    description: z.string().default('مرشدك العلمي'),
    dialogue: z.string().default('مرحباً بك في المغامرة!')
  }),
  concepts: z.array(conceptSchema).min(1),
  scenes: z.array(sceneSchema).min(3),
  misconception: z.object({
    statement: z.string().default(''),
    correction: z.string().default(''),
    conceptId: z.string().default('c1')
  }).optional().default({ statement: '', correction: '', conceptId: 'c1' }),
  ending: z.string(),
  teacherKey: z.array(z.object({
    concept: z.string(),
    evaluationCriteria: z.string()
  })).optional().default([])
}).transform((data) => {
  // Ensure concepts have IDs c1, c2, c3
  data.concepts.forEach((c, idx) => {
    if (!c.id) c.id = `c${idx + 1}`;
  });

  const conceptIds = new Set(data.concepts.map(c => c.id));

  // Ensure scenes have valid conceptIds
  data.scenes.forEach((scene, idx) => {
    if (!conceptIds.has(scene.conceptId)) {
      scene.conceptId = data.concepts[idx % data.concepts.length].id;
    }

    // Fix category references in classification scene
    if (scene.gameType === 'classification' && scene.challenge) {
      const categories = scene.challenge.categories || [];
      const items = scene.challenge.items || [];
      const catIds = new Set(categories.map(cat => cat.id));
      const firstCatId = categories[0]?.id || 'cat1';

      items.forEach(item => {
        if (!catIds.has(item.correctCategory)) {
          item.correctCategory = firstCatId;
        }
      });
    }
  });

  return data;
});
