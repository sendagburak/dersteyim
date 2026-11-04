// Original synthesised tones: no downloaded audio or network connection is used.
const PATTERNS = {
  YANGIN: [[880, 0, .35], [660, .42, .35], [880, .84, .35]],
  DEPREM: [[740, 0, .30], [740, .38, .30], [740, .76, .30]],
  TAHLIYE: [[520, 0, .40], [780, .50, .40]],
  GUVENLIK: [[620, 0, .65], [440, .75, .65]],
  SAGLIK: [[780, 0, .22], [980, .30, .22], [780, .60, .22], [980, .90, .22]],
};
const CYCLE_MS = 2200;

export function createEmergencySound(AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, timers = globalThis) {
  let context = null;
  let repeat = null;
  let previewEnd = null;
  const nodes = new Set();

  // Must be called synchronously from a user gesture, before awaiting a request.
  async function unlock() {
    if (!AudioContextClass) return false;
    try {
      if (!context || context.state === 'closed') context = new AudioContextClass();
      if (context.state !== 'running') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  }

  function stop() {
    if (repeat !== null) timers.clearInterval(repeat);
    if (previewEnd !== null) timers.clearTimeout(previewEnd);
    repeat = null;
    previewEnd = null;
    for (const oscillator of nodes) {
      try { oscillator.stop(); } catch { /* Already stopped. */ }
      try { oscillator.disconnect(); } catch { /* Already disconnected. */ }
    }
    nodes.clear();
  }

  function start(type, {preview = false} = {}) {
    stop();
    if (!context || context.state !== 'running') return false;
    const pattern = PATTERNS[type] || PATTERNS.YANGIN;
    const playCycle = () => {
      const base = context.currentTime + .03;
      for (const [frequency, offset, duration] of pattern) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = base + offset;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(.0001, startAt);
        gain.gain.linearRampToValueAtTime(.24, startAt + .025);
        gain.gain.setValueAtTime(.24, startAt + duration - .025);
        gain.gain.linearRampToValueAtTime(.0001, startAt + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        nodes.add(oscillator);
        oscillator.onended = () => { nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(startAt);
        oscillator.stop(startAt + duration);
      }
    };
    try {
      playCycle();
      if (preview) previewEnd = timers.setTimeout(stop, CYCLE_MS);
      else repeat = timers.setInterval(playCycle, CYCLE_MS);
      return true;
    } catch {
      stop();
      return false;
    }
  }

  function dispose() {
    stop();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    context = null;
  }

  return {unlock, start, stop, dispose};
}
