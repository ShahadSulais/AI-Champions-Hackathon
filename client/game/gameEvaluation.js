import { normalizeArabic } from '../../shared/arabicNormalizer.js';

export function evaluateCurrentGame(sceneData, interactiveData) {
  const type = sceneData.gameType;

  if (type === 'classification') {
    const items = sceneData.challenge.items || [];
    const assignments = interactiveData.assignments || {};
    const assignedCount = Object.keys(assignments).length;

    // Check if all items are assigned
    if (assignedCount < items.length) {
      return {
        isComplete: false,
        isCorrect: false,
        message: 'يرجى تصنيف جميع العناصر قبل التحقق من الإجابة.'
      };
    }

    let correctCount = 0;
    items.forEach(item => {
      if (assignments[item.id] === item.correctCategory) {
        correctCount++;
      }
    });

    const isCorrect = (correctCount === items.length);
    return {
      isComplete: true,
      isCorrect,
      evaluationDetails: { correctCount, total: items.length }
    };

  } else if (type === 'ordering') {
    const steps = interactiveData.steps || [];
    let correctCount = 0;
    steps.forEach((step, idx) => {
      if (step.correctOrder === (idx + 1)) {
        correctCount++;
      }
    });

    const isCorrect = (correctCount === steps.length && steps.length > 0);
    return {
      isComplete: true,
      isCorrect,
      evaluationDetails: { correctCount, total: steps.length }
    };

  } else if (type === 'written_answer') {
    const inputEl = typeof document !== 'undefined' ? document.getElementById('student-written-input') : null;
    const rawStudentText = inputEl ? inputEl.value : (interactiveData.studentText || '');
    const studentText = rawStudentText.trim();

    if (!studentText) {
      return {
        isComplete: false,
        isCorrect: false,
        message: 'يرجى كتابة إجابة قبل التحقق.'
      };
    }

    const normStudent = normalizeArabic(studentText);
    const normExpected = normalizeArabic(sceneData.challenge.expectedAnswer || '');

    // Collect keywords (explicit keywords or words from expected answer > 2 chars)
    let keywords = (sceneData.challenge.keywords || []).map(k => normalizeArabic(k));
    if (keywords.length === 0 && normExpected) {
      keywords = normExpected.split(' ').filter(w => w.length >= 3);
    }

    let isCorrect = false;

    // 1. Direct normalized match or substring match
    if (normStudent === normExpected || (normExpected && normStudent.includes(normExpected))) {
      isCorrect = true;
    } else if (keywords.length > 0) {
      // 2. Keyword match: check if student text contains all/any key words
      const matchedKeywords = keywords.filter(kw => kw && normStudent.includes(kw));
      // If at least 50% of key words are matched
      isCorrect = matchedKeywords.length > 0 && (matchedKeywords.length / keywords.length) >= 0.5;
    }

    return {
      isComplete: true,
      isCorrect,
      evaluationDetails: {
        studentText,
        normStudent,
        normExpected,
        isCorrect
      }
    };
  }

  return { isComplete: false, isCorrect: false };
}
