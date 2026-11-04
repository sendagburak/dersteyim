const {test} = require('node:test');
const assert = require('node:assert/strict');

function fixture() {
  const frequencies = [];
  const oscillators = [];
  const tasks = new Map();
  let nextTask = 0;
  class MockAudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
    createOscillator() {
      const node = {frequency: {setValueAtTime: value => frequencies.push(value)}, connect() {}, disconnect() {}, start() {}, stop() { this.stopCalls = (this.stopCalls || 0) + 1; }};
      oscillators.push(node);
      return node;
    }
    createGain() { return {gain: {setValueAtTime() {}, linearRampToValueAtTime() {}}, connect() {}, disconnect() {}}; }
  }
  const timers = {
    setInterval(fn) { const id = ++nextTask; tasks.set(id, fn); return id; },
    clearInterval(id) { tasks.delete(id); },
    setTimeout(fn) { const id = ++nextTask; tasks.set(id, fn); return id; },
    clearTimeout(id) { tasks.delete(id); },
  };
  return {MockAudioContext, timers, frequencies, oscillators, tasks};
}

test('alarm only plays after sound has been enabled, and stops repeating on resolve', async () => {
  const {createEmergencySound} = await import('../client/src/emergencySound.js');
  const f = fixture(), sound = createEmergencySound(f.MockAudioContext, f.timers);
  assert.equal(sound.start('YANGIN'), false);
  assert.equal(f.oscillators.length, 0);
  assert.equal(await sound.unlock(), true);
  assert.equal(f.oscillators.length, 0, 'enabling audio must not itself trigger an alarm');
  assert.equal(sound.start('YANGIN'), true);
  assert.deepEqual(f.frequencies, [880, 660, 880]);
  assert.equal(f.tasks.size, 1);
  [...f.tasks.values()][0]();
  assert.equal(f.oscillators.length, 6, 'active alarm repeats');
  sound.stop();
  assert.equal(f.tasks.size, 0);
  assert.ok(f.oscillators.every(node => node.stopCalls >= 2));
  sound.dispose();
});

test('each emergency type has a distinct original tone; preview runs only once', async () => {
  const {createEmergencySound} = await import('../client/src/emergencySound.js');
  const sounds = [];
  for (const type of ['YANGIN', 'DEPREM', 'TAHLIYE', 'GUVENLIK', 'SAGLIK']) {
    const f = fixture(), sound = createEmergencySound(f.MockAudioContext, f.timers);
    await sound.unlock();
    assert.equal(sound.start(type, {preview: true}), true);
    sounds.push(f.frequencies.join(','));
    assert.equal(f.tasks.size, 1);
    const length = f.oscillators.length;
    [...f.tasks.values()][0]();
    assert.equal(f.tasks.size, 0);
    assert.equal(f.oscillators.length, length);
    sound.dispose();
  }
  assert.equal(new Set(sounds).size, 5);
});

test('blocked audio is reported and does not create oscillators', async () => {
  const {createEmergencySound} = await import('../client/src/emergencySound.js');
  class BlockedAudioContext { constructor() { this.state = 'suspended'; } async resume() { throw new Error('blocked'); } async close() {} }
  const sound = createEmergencySound(BlockedAudioContext);
  assert.equal(await sound.unlock(), false);
  assert.equal(sound.start('DEPREM'), false);
  sound.dispose();
});
