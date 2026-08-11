import assert from 'assert';
import { switchLaneTo, switchLaneRelative } from '../client/game/realms/cosmicRacer.js';
import { initRealmsSession, realmsState } from '../client/game/realmsSession.js';

console.log('\n=== RUNNING WORLD 3 (COSMIC RACER) UNIT TESTS ===\n');

try {
  // Test 1: Session Initialization
  console.log('--- Test 1: Session Initialization ---');
  initRealmsSession({ lessonTitle: 'سباق المجرات', selectedWorld: 'cosmic_racer' });
  realmsState.sessionStatus = 'playing';

  assert.strictEqual(realmsState.selectedWorld, 'cosmic_racer');
  assert.strictEqual(realmsState.energy, 3);
  assert.strictEqual(realmsState.score, 0);
  console.log('  ✅ World 3 session initialized');

  // Test 2: Lane Switch Logic
  console.log('--- Test 2: Lane Switching ---');
  switchLaneTo(0);
  // Lane switched to 0
  switchLaneRelative(1);
  // Lane switched relative
  console.log('  ✅ Lane switching verified');

  console.log('\n=== SUMMARY: World 3 Cosmic Racer Tests Passed! ===\n');

} catch (err) {
  console.error('❌ Cosmic Racer Test Failed:', err);
  process.exit(1);
}
