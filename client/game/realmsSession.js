import { REALMS_FALLBACK_DATA } from '../data/realmsFallback.js';
import { getMemory, updateMemory } from '../services/memoryService.js';

export const realmsState = {
  lessonId: '',
  lessonTitle: 'مهمة حُرّاس الأكوان',
  selectedWorld: 'maze', // 'maze' | 'sky_islands' | 'cosmic_racer' | 'star_guardian'
  difficulty: 1,
  adaptiveBadgeText: '',
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  title: '',
  intro: '',
  studentName: '',
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  energy: 3,
  maxEnergy: 3,
  combo: 0,
  maxCombo: 0,
  levelProgress: 0,
  achievements: [],
  earnedBadges: [],
  completedQuestions: [],
  incorrectQuestionsSummary: [],
  collectedShards: [], // ['maze', 'sky_islands', 'cosmic_racer', 'star_guardian']
  isCoreRestored: false,
  devUnlockAllWorlds: true, // Developer setting to unlock all worlds for testing
  sessionStatus: 'ready' // 'ready' | 'playing' | 'paused' | 'success' | 'game_over'
};

export function initRealmsSession({ lessonTitle, selectedWorld = 'maze', realmsData = null, difficulty = 1 }) {
  const data = (realmsData && Array.isArray(realmsData.questions) && realmsData.questions.length > 0)
    ? realmsData
    : REALMS_FALLBACK_DATA;

  const memory = getMemory();
  const profileName = memory?.profileSummary ? (memory.profileSummary.split(' ')[0] || '') : '';

  // Determine initial difficulty based on profile memory if available
  let initialDifficulty = difficulty;
  if (memory?.struggleAreas && memory.struggleAreas.length > 0) {
    initialDifficulty = 1; // Friendly starting point if student had struggle areas
  } else if (memory?.sessionsCount && memory.sessionsCount >= 2) {
    initialDifficulty = 2; // Elevated challenge for experienced students
  }

  realmsState.lessonId = `lesson_${Date.now()}`;
  realmsState.lessonTitle = lessonTitle || data.title || 'مهمة حُرّاس الأكوان';
  realmsState.selectedWorld = selectedWorld;
  realmsState.difficulty = initialDifficulty;
  realmsState.adaptiveBadgeText = initialDifficulty > 1 ? 'مستوى تحدٍ تحليلي متقدم' : 'مستوى استكشافي مبسط';
  realmsState.consecutiveCorrect = 0;
  realmsState.consecutiveWrong = 0;
  realmsState.studentName = profileName;

  realmsState.title = data.title || 'مهمة حُرّاس الأكوان';
  realmsState.intro = data.intro || 'انطلق في مغامرة الأكوان المعرفية!';
  realmsState.questions = data.questions.map((q, idx) => ({
    id: q.id || `q_${idx + 1}`,
    type: 'multiple_choice',
    question: q.question || 'سؤال معرفي',
    choices: Array.isArray(q.choices) ? q.choices : [],
    correctChoiceId: q.correctChoiceId || (q.choices && q.choices[0] ? q.choices[0].id : 'a'),
    explanation: q.explanation || 'تفسير علمي دقيق.',
    difficulty: q.difficulty || initialDifficulty
  }));

  realmsState.currentQuestionIndex = 0;
  realmsState.score = 0;
  realmsState.energy = 3;
  realmsState.maxEnergy = 3;
  realmsState.combo = 0;
  realmsState.maxCombo = 0;
  realmsState.levelProgress = 0;
  realmsState.achievements = [];
  realmsState.earnedBadges = [];
  realmsState.completedQuestions = [];
  realmsState.incorrectQuestionsSummary = [];
  realmsState.sessionStatus = 'playing';

  return realmsState;
}


export function getCurrentQuestion() {
  if (!realmsState.questions || realmsState.questions.length === 0) return null;
  return realmsState.questions[realmsState.currentQuestionIndex] || null;
}

export function submitRealmsAnswer(choiceId) {
  const currentQ = getCurrentQuestion();
  if (!currentQ) {
    return { isCorrect: false, error: 'لا يوجد سؤال حالي' };
  }

  const isCorrect = choiceId === currentQ.correctChoiceId;
  const currIdx = realmsState.currentQuestionIndex;

  if (isCorrect) {
    realmsState.consecutiveCorrect += 1;
    realmsState.consecutiveWrong = 0;

    // Adaptive Difficulty Scaling: Increase difficulty after 2 consecutive correct answers
    if (realmsState.consecutiveCorrect >= 2 && realmsState.difficulty < 3) {
      realmsState.difficulty += 1;
      realmsState.adaptiveBadgeText = 'تم رفع مستوى التحديث المعرفي بنجاح!';
    }

    realmsState.combo += 1;
    if (realmsState.combo > realmsState.maxCombo) {
      realmsState.maxCombo = realmsState.combo;
    }
    const comboMultiplier = Math.min(realmsState.combo, 4);
    const earnedXp = 100 * comboMultiplier;
    realmsState.score += earnedXp;

    realmsState.completedQuestions.push({
      questionId: currentQ.id,
      selectedChoiceId: choiceId,
      isCorrect: true,
      xpEarned: earnedXp
    });

    realmsState.levelProgress = Math.round(((currIdx + 1) / realmsState.questions.length) * 100);

    return {
      isCorrect: true,
      earnedXp,
      combo: realmsState.combo,
      explanation: currentQ.explanation,
      adaptiveBadgeText: realmsState.adaptiveBadgeText,
      isFinished: currIdx >= realmsState.questions.length - 1
    };

  } else {
    realmsState.consecutiveWrong += 1;
    realmsState.consecutiveCorrect = 0;

    // Adaptive Assistance: Provide hints & reduce conceptual difficulty after 2 mistakes
    if (realmsState.consecutiveWrong >= 2 && realmsState.difficulty > 1) {
      realmsState.difficulty -= 1;
      realmsState.adaptiveBadgeText = 'تم تقديم تلميحات داعمة وتيسير المفاهيم';
    }

    realmsState.combo = 0;
    realmsState.energy = Math.max(0, realmsState.energy - 1);

    const selectedObj = currentQ.choices.find(c => c.id === choiceId);
    const correctObj = currentQ.choices.find(c => c.id === currentQ.correctChoiceId);

    realmsState.incorrectQuestionsSummary.push({
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedText: selectedObj ? selectedObj.text : 'لم يتم التحديد',
      correctText: correctObj ? correctObj.text : 'الإجابة الصحيحة',
      explanation: currentQ.explanation
    });

    realmsState.completedQuestions.push({
      questionId: currentQ.id,
      selectedChoiceId: choiceId,
      isCorrect: false,
      xpEarned: 0
    });

    if (realmsState.energy === 0) {
      realmsState.sessionStatus = 'game_over';
    }

    return {
      isCorrect: false,
      remainingEnergy: realmsState.energy,
      explanation: currentQ.explanation,
      adaptiveBadgeText: realmsState.adaptiveBadgeText,
      isGameOver: realmsState.energy === 0
    };
  }
}

export function nextRealmsQuestion() {
  if (realmsState.currentQuestionIndex < realmsState.questions.length - 1) {
    realmsState.currentQuestionIndex += 1;
    realmsState.levelProgress = Math.round(((realmsState.currentQuestionIndex) / realmsState.questions.length) * 100);
    return true;
  } else {
    return finishRealmsWorldCompletion();
  }
}

export function finishRealmsWorldCompletion() {
  realmsState.levelProgress = 100;
  realmsState.sessionStatus = 'success';

  // World Shards & Core Progression
  if (!realmsState.collectedShards.includes(realmsState.selectedWorld)) {
    realmsState.collectedShards.push(realmsState.selectedWorld);
  }

  if (realmsState.collectedShards.length >= 4) {
    realmsState.isCoreRestored = true;
    if (!realmsState.earnedBadges.includes('core_restorer')) {
      realmsState.earnedBadges.push('core_restorer');
    }
  }

  // Award Ethical Rewards & Badges based on performance
  if (realmsState.collectedShards.length >= 1 && !realmsState.earnedBadges.includes('shard_collector')) {
    realmsState.earnedBadges.push('shard_collector');
  }

  const accuracy = Math.round(
    (realmsState.completedQuestions.filter(q => q.isCorrect).length / realmsState.questions.length) * 100
  );

  if (accuracy === 100 && !realmsState.earnedBadges.includes('accuracy_master')) {
    realmsState.earnedBadges.push('accuracy_master');
  }

  // Update Memory Service
  const masteredNames = realmsState.completedQuestions.filter(q => q.isCorrect).map(q => `سؤال #${q.questionId}`);
  const struggleNames = realmsState.incorrectQuestionsSummary.map(q => q.questionText.slice(0, 30));

  updateMemory({
    lessonTitle: realmsState.lessonTitle,
    scoreSummary: `${accuracy}% دقة الأكوان`,
    mastered: masteredNames,
    struggles: struggleNames
  });

  return false;
}

export function startPracticeReviewSession() {
  if (realmsState.incorrectQuestionsSummary.length > 0) {
    // Generate practice review questions from missed questions
    realmsState.questions = realmsState.incorrectQuestionsSummary.map((inc, i) => ({
      id: `review_${i + 1}`,
      type: 'multiple_choice',
      question: `[مراجعة مفاهيمية]: ${inc.questionText}`,
      choices: [
        { id: 'a', text: inc.correctText },
        { id: 'b', text: 'خيار مراجعة بديل 1' },
        { id: 'c', text: 'خيار مراجعة بديل 2' },
        { id: 'd', text: 'خيار مراجعة بديل 3' }
      ],
      correctChoiceId: 'a',
      explanation: inc.explanation,
      difficulty: 1
    }));
  }

  realmsState.currentQuestionIndex = 0;
  realmsState.score = 0;
  realmsState.energy = realmsState.maxEnergy;
  realmsState.combo = 0;
  realmsState.levelProgress = 0;
  realmsState.completedQuestions = [];
  realmsState.incorrectQuestionsSummary = [];
  realmsState.sessionStatus = 'playing';

  return realmsState;
}

export function pauseRealmsSession() {
  if (realmsState.sessionStatus === 'playing') {
    realmsState.sessionStatus = 'paused';
  }
}

export function resumeRealmsSession() {
  if (realmsState.sessionStatus === 'paused') {
    realmsState.sessionStatus = 'playing';
  }
}

export function retryRealmsSession() {
  realmsState.currentQuestionIndex = 0;
  realmsState.score = 0;
  realmsState.energy = realmsState.maxEnergy;
  realmsState.combo = 0;
  realmsState.levelProgress = 0;
  realmsState.completedQuestions = [];
  realmsState.incorrectQuestionsSummary = [];
  realmsState.sessionStatus = 'playing';
  return realmsState;
}
