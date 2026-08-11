import assert from 'assert';
import { handleNinjaCutChoice } from '../client/game/realms/ninjaGuardian.js';
import { initRealmsSession, realmsState } from '../client/game/realmsSession.js';

console.log('\n=== RUNNING NINJA GUARDIAN UNIT TESTS ===\n');

try {
  // Test 1: Session Initialization
  console.log('--- Test 1: Session Initialization ---');
  initRealmsSession({ lessonTitle: 'نينجا المعرفة', selectedWorld: 'ninja_guardian' });
  realmsState.sessionStatus = 'playing';

  assert.strictEqual(realmsState.selectedWorld, 'ninja_guardian');
  assert.strictEqual(realmsState.energy, 3);
  assert.strictEqual(realmsState.score, 0);
  console.log('  ✅ Ninja Knowledge session initialized');

  // Test 2: Slice Action Submission
  console.log('--- Test 2: Slice Action Submission ---');
  const q1 = realmsState.questions[0];
  const correctChoice = q1.correctChoiceId;
  handleNinjaCutChoice(correctChoice);
  assert.strictEqual(realmsState.score, 100);
  console.log('  ✅ Ninja Katana slice action & score update verified');

  console.log('\n=== SUMMARY: Ninja Guardian Tests Passed! ===\n');

} catch (err) {
  console.error('❌ Ninja Guardian Test Failed:', err);
  process.exit(1);
}
