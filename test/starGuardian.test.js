import assert from 'assert';
import { handleGuardianActionSubmit } from '../client/game/realms/starGuardian.js';
import { initRealmsSession, realmsState } from '../client/game/realmsSession.js';

console.log('\n=== RUNNING WORLD 4 (STAR GUARDIAN) UNIT TESTS ===\n');

try {
  // Test 1: Session Initialization
  console.log('--- Test 1: Session Initialization ---');
  initRealmsSession({ lessonTitle: 'حارس النجوم', selectedWorld: 'star_guardian' });
  realmsState.sessionStatus = 'playing';

  assert.strictEqual(realmsState.selectedWorld, 'star_guardian');
  assert.strictEqual(realmsState.energy, 3);
  assert.strictEqual(realmsState.score, 0);
  console.log('  ✅ World 4 session initialized');

  // Test 2: Action Submission
  console.log('--- Test 2: Mission Action Submission ---');
  const q1 = realmsState.questions[0];
  const correctChoice = q1.correctChoiceId;
  handleGuardianActionSubmit(correctChoice);
  assert.strictEqual(realmsState.score, 100);
  console.log('  ✅ Mission action submission & score update verified');

  console.log('\n=== SUMMARY: World 4 Star Guardian Tests Passed! ===\n');

} catch (err) {
  console.error('❌ Star Guardian Test Failed:', err);
  process.exit(1);
}
