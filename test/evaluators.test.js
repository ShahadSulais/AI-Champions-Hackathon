import { normalizeArabic } from '../shared/arabicNormalizer.js';
import { evaluateCurrentGame } from '../client/game/gameEvaluation.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== RUNNING GAMEPLAY & EVALUATOR UNIT TESTS ===\n');

// --- 1. Arabic Normalizer Tests ---
console.log('--- Suite 1: Arabic Normalizer ---');
assert(normalizeArabic('الْكُلُورُوفِيلُ') === 'الكلوروفيل', 'Removes tashkeel correctly');
assert(normalizeArabic('إجابة أمل آية ٱبتقار') === 'اجابه امل ايه ابتقار', 'Normalizes Alef variants & Ta Marbuta');
assert(normalizeArabic('البناء الضوئي!') === 'البناء الضوئي', 'Strips punctuation');
assert(normalizeArabic('   اختبار   متعدد    ') === 'اختبار متعدد', 'Collapses whitespace and trims');
assert(normalizeArabic('') === '', 'Handles empty string safely');

// --- 2. Classification Evaluator Tests ---
console.log('\n--- Suite 2: Classification Evaluator ---');

const sampleClassScene = {
  gameType: 'classification',
  challenge: {
    categories: [
      { id: 'cat1', label: 'مدخلات' },
      { id: 'cat2', label: 'مخرجات' }
    ],
    items: [
      { id: 'i1', text: 'الماء', correctCategory: 'cat1' },
      { id: 'i2', text: 'ثاني أكسيد الكربون', correctCategory: 'cat1' },
      { id: 'i3', text: 'الأكسجين', correctCategory: 'cat2' }
    ]
  }
};

// Case A: Incomplete assignment
const incompleteClass = evaluateCurrentGame(sampleClassScene, {
  assignments: { i1: 'cat1', i2: 'cat1' } // i3 missing
});
assert(incompleteClass.isComplete === false, 'Rejects submission if items remain unassigned');
assert(incompleteClass.message.includes('تصنيف جميع العناصر'), 'Provides clear Arabic instruction for incomplete assignment');

// Case B: Incorrect assignment
const wrongClass = evaluateCurrentGame(sampleClassScene, {
  assignments: { i1: 'cat1', i2: 'cat2', i3: 'cat2' } // i2 wrong
});
assert(wrongClass.isComplete === true && wrongClass.isCorrect === false, 'Detects incorrect assignment accurately');

// Case C: Correct assignment
const correctClass = evaluateCurrentGame(sampleClassScene, {
  assignments: { i1: 'cat1', i2: 'cat1', i3: 'cat2' }
});
assert(correctClass.isComplete === true && correctClass.isCorrect === true, 'Evaluates correct classification submission');

// --- 3. Ordering Evaluator Tests ---
console.log('\n--- Suite 3: Ordering Evaluator ---');

const sampleOrderingScene = {
  gameType: 'ordering',
  challenge: {
    steps: [
      { id: 'st1', text: 'امتصاص الماء', correctOrder: 1 },
      { id: 'st2', text: 'امتصاص الضوء', correctOrder: 2 },
      { id: 'st3', text: 'إنتاج الجلوكوز', correctOrder: 3 }
    ]
  }
};

// Case A: Out of order
const wrongOrdering = evaluateCurrentGame(sampleOrderingScene, {
  steps: [
    { id: 'st2', text: 'امتصاص الضوء', correctOrder: 2 },
    { id: 'st1', text: 'امتصاص الماء', correctOrder: 1 },
    { id: 'st3', text: 'إنتاج الجلوكوز', correctOrder: 3 }
  ]
});
assert(wrongOrdering.isComplete === true && wrongOrdering.isCorrect === false, 'Detects incorrect step sequence');

// Case B: Correct order
const correctOrdering = evaluateCurrentGame(sampleOrderingScene, {
  steps: [
    { id: 'st1', text: 'امتصاص الماء', correctOrder: 1 },
    { id: 'st2', text: 'امتصاص الضوء', correctOrder: 2 },
    { id: 'st3', text: 'إنتاج الجلوكوز', correctOrder: 3 }
  ]
});
assert(correctOrdering.isComplete === true && correctOrdering.isCorrect === true, 'Evaluates correct ordering sequence');

// --- 4. Written Answer Evaluator Tests ---
console.log('\n--- Suite 4: Written Answer Evaluator ---');

const sampleWrittenScene = {
  gameType: 'written_answer',
  challenge: {
    question: 'ما هو الصبغ المسؤول عن امتصاص ضوء الشمس؟',
    expectedAnswer: 'الكلوروفيل',
    keywords: ['كلوروفيل', 'الكلوروفيل']
  }
};

// Case A: Empty input
const emptyWritten = evaluateCurrentGame(sampleWrittenScene, { studentText: '' });
assert(emptyWritten.isComplete === false, 'Rejects empty written submission');

// Case B: Arbitrary long answer (>5 chars) which is wrong - verify NO automatic pass!
const longWrongWritten = evaluateCurrentGame(sampleWrittenScene, { studentText: 'هذه إجابة طويلة جداً ولكنها خاطئة وغير متعلقة' });
assert(longWrongWritten.isComplete === true && longWrongWritten.isCorrect === false, 'Does NOT mark arbitrary text >5 chars as correct');

// Case C: Exact / Normalized answer with diacritics
const exactWithTashkeel = evaluateCurrentGame(sampleWrittenScene, { studentText: 'اَلْكُلُورُوفِيلُ' });
assert(exactWithTashkeel.isCorrect === true, 'Matches normalized answer with diacritics');

// Case D: Answer containing keyword with slight spelling variant
const keywordVariant = evaluateCurrentGame(sampleWrittenScene, { studentText: 'هو صبغ كلوروفيل' });
assert(keywordVariant.isCorrect === true, 'Matches accepted keywords with spelling variants');

console.log(`\n=== SUMMARY: ${passed} Passed, ${failed} Failed ===`);
if (failed > 0) {
  process.exit(1);
}
