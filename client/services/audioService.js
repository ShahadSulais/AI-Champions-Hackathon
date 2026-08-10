let audioCtx = null;
let currentlySpeakingText = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function playSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'incorrect') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(150, now + 0.15);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'scene_complete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
    }
  } catch (err) {
    console.warn('Audio playSound warning:', err);
  }
}

export function stopSpeech() {
  currentlySpeakingText = null;
  const player = document.getElementById('global-tts-player');
  if (player) {
    try {
      player.pause();
      player.currentTime = 0;
    } catch (e) {}
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

export function speakText(text) {
  if (!text || !text.trim()) return;

  const cleanText = text.trim();
  const player = document.getElementById('global-tts-player');

  // Toggle off if exact same text is currently playing
  if (currentlySpeakingText === cleanText && player && !player.paused) {
    stopSpeech();
    return;
  }

  stopSpeech();
  currentlySpeakingText = cleanText;
  playSound('select');

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : '';

  const truncated = cleanText.slice(0, 250);
  const ttsUrl = `${API_BASE}/api/tts?text=${encodeURIComponent(truncated)}`;

  if (player) {
    player.src = ttsUrl;
    player.onended = () => {
      if (currentlySpeakingText === cleanText) {
        currentlySpeakingText = null;
      }
    };
    player.onerror = (e) => {
      console.warn('HTML5 Audio player error:', e);
      currentlySpeakingText = null;
    };

    player.play().catch(err => {
      console.warn('HTML5 Audio play prevented:', err);
      currentlySpeakingText = null;
    });
  }
}
