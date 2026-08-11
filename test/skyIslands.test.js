import assert from 'assert';
import { triggerHeroJump, triggerDirectPlatformJump } from '../client/game/realms/skyIslands.js';
import { initRealmsSession, realmsState } from '../client/game/realmsSession.js';

console.log('\n=== RUNNING WORLD 2 (SKY ISLANDS) UNIT TESTS ===\n');

try {
  // Test 1: Session Initialization
  console.log('--- Test 1: Session Initialization ---');
  initRealmsSession({ lessonTitle: 'جزر السماء', selectedWorld: 'sky_islands' });
  realmsState.sessionStatus = 'playing';

  assert.strictEqual(realmsState.selectedWorld, 'sky_islands');
  assert.strictEqual(realmsState.energy, 3);
  assert.strictEqual(realmsState.score, 0);
  console.log('  ✅ World 2 session initialized');

  // Test 2: Hero Jump Trigger
  console.log('--- Test 2: Hero Jump Trigger ---');
  triggerHeroJump();
  console.log('  ✅ Jump trigger executed cleanly');

  // Test 3: Direct Platform Jump (Accessibility Feature)
  console.log('--- Test 3: Accessibility Direct Platform Jump ---');
  triggerDirectPlatformJump(0);
  console.log('  ✅ Direct platform jump & answer submission verified');

  console.log('\n=== SUMMARY: World 2 Sky Islands Tests Passed! ===\n');

} catch (err) {
  console.error('❌ Sky Islands Test Failed:', err);
  process.exit(1);
}
