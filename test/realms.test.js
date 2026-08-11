import assert from 'assert';
import { REALMS_FALLBACK_DATA } from '../client/data/realmsFallback.js';
import { initRealmsSession, submitRealmsAnswer, nextRealmsQuestion, pauseRealmsSession, resumeRealmsSession, retryRealmsSession, realmsState } from '../client/game/realmsSession.js';

console.log('\n=== RUNNING PORTAL OF REALMS FOUNDATION TESTS ===\n');

try {
  // Test 1: Fallback Question Data Integrity
  console.log('--- Test 1: Fallback Questions Data ---');
  assert.ok(REALMS_FALLBACK_DATA.title, 'Fallback data has title');
  assert.ok(Array.isArray(REALMS_FALLBACK_DATA.questions), 'Fallback data has questions array');
  assert.ok(REALMS_FALLBACK_DATA.questions.length >= 3, 'At least 3 fallback questions present');
  REALMS_FALLBACK_DATA.questions.forEach((q, i) => {
    assert.ok(q.id, `Question ${i + 1} has id`);
    assert.ok(q.question, `Question ${i + 1} has question text`);
    assert.ok(Array.isArray(q.choices) && q.choices.length === 4, `Question ${i + 1} has 4 choices`);
    assert.ok(q.correctChoiceId, `Question ${i + 1} has correctChoiceId`);
  });
  console.log('  ✅ Fallback data structure validated');

  // Test 2: Session Initialization
  console.log('--- Test 2: Session Initialization ---');
  initRealmsSession({ lessonTitle: 'دورة الماء في الطبيعة', selectedWorld: 'maze' });
  assert.strictEqual(realmsState.lessonTitle, 'دورة الماء في الطبيعة');
  assert.strictEqual(realmsState.selectedWorld, 'maze');
  assert.strictEqual(realmsState.energy, 3);
  assert.strictEqual(realmsState.score, 0);
  assert.strictEqual(realmsState.combo, 0);
  console.log('  ✅ Session initialized cleanly');

  // Test 3: Correct Answer Evaluation & Streak
  console.log('--- Test 3: Correct Answer Submission ---');
  const q1 = realmsState.questions[0];
  const correctChoice = q1.correctChoiceId;
  const res1 = submitRealmsAnswer(correctChoice);
  assert.strictEqual(res1.isCorrect, true);
  assert.strictEqual(realmsState.score, 100);
  assert.strictEqual(realmsState.combo, 1);
  console.log('  ✅ Correct answer updates score and combo');

  // Test 4: Incorrect Answer & Energy Depletion
  console.log('--- Test 4: Incorrect Answer Submission ---');
  const res2 = submitRealmsAnswer('invalid_choice_id');
  assert.strictEqual(res2.isCorrect, false);
  assert.strictEqual(realmsState.combo, 0);
  assert.strictEqual(realmsState.energy, 2);
  console.log('  ✅ Incorrect answer resets combo and depletes energy');

  // Test 5: Next Question Navigation & Completion State
  console.log('--- Test 5: Navigation & Completion ---');
  nextRealmsQuestion();
  assert.strictEqual(realmsState.currentQuestionIndex, 1);

  retryRealmsSession();
  assert.strictEqual(realmsState.currentQuestionIndex, 0);
  assert.strictEqual(realmsState.energy, 3);
  assert.strictEqual(realmsState.score, 0);
  console.log('  ✅ Retry resets session state cleanly');

  // Test 6: Pause and Resume
  console.log('--- Test 6: Pause & Resume ---');
  pauseRealmsSession();
  assert.strictEqual(realmsState.sessionStatus, 'paused');
  resumeRealmsSession();
  assert.strictEqual(realmsState.sessionStatus, 'playing');
  console.log('  ✅ Pause and Resume works correctly');

  console.log('\n=== SUMMARY: All Portal of Realms Foundation Tests Passed! ===\n');

} catch (err) {
  console.error('❌ Realms Test Failed:', err);
  process.exit(1);
}
