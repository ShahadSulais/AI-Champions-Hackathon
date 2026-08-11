import { z } from 'zod';

export const requestSchema = z.object({
  lessonTitle: z.string().min(1, 'عنوان الدرس مطلوب').max(200, 'عنوان الدرس طويل جداً'),
  studentLevel: z.string().min(1, 'المستوى التعليمي مطلوب').max(200, 'المستوى التعليمي طويل جداً'),
  lessonText: z.string().min(10, 'نص الدرس قصير جداً').max(20000, 'نص الدرس طويل جداً (الحد الأقصى 20,000 حرف)'),
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

export const lessonTermSchema = z.object({
  term: z.string(),
  definition: z.string()
});

export const lessonFormulaSchema = z.object({
  formula: z.string(),
  explanation: z.string()
});

export const lessonBriefingSchema = z.object({
  title: z.string().default('عنوان الدرس'),
  subject: z.string().default('المادة الدراسية'),
  summary: z.string().default('ملخص الدرس العلمي.'),
  keyPoints: z.array(z.string()).default([]),
  terms: z.array(lessonTermSchema).default([]),
  formulas: z.array(lessonFormulaSchema).default([]),
  estimatedReadingMinutes: z.number().default(2)
});

export const storySceneSchema = z.object({
  id: z.string().default('scene_1'),
  narration: z.string(),
  dialogue: z.string().optional().default(''),
  backgroundDescription: z.string().optional().default(''),
  soundDescription: z.string().optional().default('')
});

export const storyIntroSchema = z.object({
  title: z.string().default('مهمة حُرّاس المعرفة'),
  missionObjective: z.string().default('استعادة مفاهيم الدرس وإعادة التوازن المعرفي.'),
  scenes: z.array(storySceneSchema).min(1)
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
  })).optional().default([]),
  lesson: lessonBriefingSchema.optional(),
  story: storyIntroSchema.optional(),
  questions: z.array(z.any()).optional().default([])
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

export const realmChoiceSchema = z.object({
  id: z.string(),
  text: z.string()
});

export const realmQuestionSchema = z.object({
  id: z.string(),
  type: z.string().default('multiple_choice'),
  question: z.string(),
  choices: z.array(realmChoiceSchema).min(2),
  correctChoiceId: z.string(),
  explanation: z.string().default('تفسير علمي للمفهوم.'),
  difficulty: z.number().default(1)
});

export const realmOutputSchema = z.object({
  title: z.string().default('مهمة حُرّاس الأكوان'),
  intro: z.string().default('انطلق في رحلة الأكوان التفاعلية واجتاز التحديات!'),
  questions: z.array(realmQuestionSchema).min(1),
  lesson: lessonBriefingSchema.optional(),
  story: storyIntroSchema.optional()
});


