import assert from 'assert';
import { initRealmsSession, submitRealmsAnswer, nextRealmsQuestion, startPracticeReviewSession, realmsState } from '../client/game/realmsSession.js';

console.log('\n=== RUNNING ADAPTIVE LEARNING & PROGRESSION TESTS ===\n');

try {
  // Test 1: Adaptive Difficulty Scaling
  console.log('--- Test 1: Adaptive Difficulty Scaling ---');
  initRealmsSession({ lessonTitle: 'التعلم التكيفي', selectedWorld: 'maze' });
  realmsState.sessionStatus = 'playing';

  const q1 = realmsState.questions[0];

  // 1st correct answer
  submitRealmsAnswer(q1.correctChoiceId);
  nextRealmsQuestion();
  // 2nd correct answer -> should trigger difficulty escalation
  const q2Obj = realmsState.questions[realmsState.currentQuestionIndex];
  submitRealmsAnswer(q2Obj.correctChoiceId);



  assert.ok(realmsState.difficulty >= 1, 'Adaptive difficulty calculated');
  assert.strictEqual(realmsState.consecutiveCorrect, 2, 'Consecutive correct tracked');
  console.log('  ✅ Adaptive difficulty escalation verified');

  // Test 2: Shard Collection & Knowledge Core Restoration
  console.log('--- Test 2: World Shards & Core Restoration ---');
  realmsState.collectedShards = ['maze', 'sky_islands', 'cosmic_racer'];
  assert.strictEqual(realmsState.collectedShards.length, 3);

  // Complete 4th world
  realmsState.selectedWorld = 'star_guardian';
  realmsState.currentQuestionIndex = realmsState.questions.length - 1;
  nextRealmsQuestion(); // triggers finishRealmsWorldCompletion

  assert.strictEqual(realmsState.collectedShards.length, 4, '4 Shards collected');
  assert.strictEqual(realmsState.isCoreRestored, true, 'Knowledge Core fully restored!');
  console.log('  ✅ World shards & Knowledge Core restoration verified');

  // Test 3: Practice Review Session
  console.log('--- Test 3: Practice Review Session ---');
  realmsState.incorrectQuestionsSummary = [
    {
      questionId: 'q1',
      questionText: 'ما هو مصدر الطاقة الرئيسي؟',
      selectedText: 'التخمين',
      correctText: 'الشمس والتفاعل الضوئي',
      explanation: 'الشمس هي مصدر الطاقة الأساسي في عملية البناء الضوئي.'
    }
  ];

  startPracticeReviewSession();
  assert.strictEqual(realmsState.questions.length, 1, 'Practice review session generated 1 question');
  assert.strictEqual(realmsState.sessionStatus, 'playing', 'Practice session active');
  console.log('  ✅ Practice Review ("تدرب مرة أخرى") session verified');

  console.log('\n=== SUMMARY: All Adaptive Learning & Progression Tests Passed! ===\n');

} catch (err) {
  console.error('❌ Adaptive Progression Test Failed:', err);
  process.exit(1);
}
