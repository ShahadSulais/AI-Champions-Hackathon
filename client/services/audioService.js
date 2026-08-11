import { state } from '../state/gameState.js';

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

// Global user-gesture handler to unlock AudioContext on first click/touch/keypress
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'keydown', 'pointerdown'];
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {}
    unlockEvents.forEach(evt => window.removeEventListener(evt, unlockAudio));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, unlockAudio, { passive: true }));
}

export function playSound(type) {
  try {
    if (state.studentSession && state.studentSession.soundMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const runOsc = () => {
      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        const now = ctx.currentTime;

        if (type === 'select') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now); osc.stop(now + 0.12);
        } else if (type === 'correct') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.1);
          osc.frequency.setValueAtTime(783.99, now + 0.2);
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
          osc.start(now); osc.stop(now + 0.45);
        } else if (type === 'incorrect') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(160, now + 0.15);
          gainNode.gain.setValueAtTime(0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now); osc.stop(now + 0.35);
        } else if (type === 'scene_complete' || type === 'victory') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.12);
          osc.frequency.setValueAtTime(783.99, now + 0.24);
          osc.frequency.setValueAtTime(1046.50, now + 0.36);
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
          osc.start(now); osc.stop(now + 0.55);
        }
      } catch (err) {
        console.warn('Oscillator playback warning:', err);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => runOsc()).catch(() => {});
    } else {
      runOsc();
    }
  } catch (err) {
    console.warn('Audio playSound warning:', err);
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  } catch (e) {}
}

function updateTTSButtonState(isSpeaking) {
  // 1. Briefing TTS button
  const briefingBtn = document.getElementById('briefing-read-aloud-btn');
  if (briefingBtn) {
    if (isSpeaking) {
      briefingBtn.classList.add('bg-purple-900', 'text-purple-100', 'ring-2', 'ring-purple-400');
      briefingBtn.innerHTML = '<span>⏸️</span> <span>إيقاف القراءة</span>';
    } else {
      briefingBtn.classList.remove('bg-purple-900', 'text-purple-100', 'ring-2', 'ring-purple-400');
      briefingBtn.innerHTML = '<span>🔊</span> <span>اقرأها لي</span>';
    }
  }

  // 2. Story scene TTS button
  const storyBtn = document.getElementById('story-read-aloud-btn');
  if (storyBtn) {
    if (isSpeaking) {
      storyBtn.classList.add('bg-purple-900', 'text-purple-100', 'ring-2', 'ring-purple-400');
      storyBtn.innerHTML = '<span>⏸️</span> <span>إيقاف القراءة</span>';
    } else {
      storyBtn.classList.remove('bg-purple-900', 'text-purple-100', 'ring-2', 'ring-purple-400');
      storyBtn.innerHTML = '<span>🔊</span> <span>اقرأ المشهد</span>';
    }
  }

  // 3. Main scene TTS button
  const sceneBtn = document.getElementById('scene-speak-btn');
  if (sceneBtn) {
    sceneBtn.innerHTML = isSpeaking ? '<span>⏸️</span> إيقاف' : '<span>🔊</span> سرد';
  }

  // 4. Intro speak button
  const introBtn = document.getElementById('intro-speak-btn');
  if (introBtn) {
    introBtn.innerHTML = isSpeaking ? '<span>⏸️</span> إيقاف' : '<span>🔊</span> استماع';
  }

  // 5. Portal of Realms question speak button
  const realmsBtn = document.getElementById('realms-q-speak-btn');
  if (realmsBtn) {
    if (isSpeaking) {
      realmsBtn.classList.add('bg-purple-900', 'text-purple-100');
      realmsBtn.innerHTML = '<span>⏸️</span> <span>إيقاف القراءة</span>';
    } else {
      realmsBtn.classList.remove('bg-purple-900', 'text-purple-100');
      realmsBtn.innerHTML = '<span>🔊</span> <span>اقرأ السؤال</span>';
    }
  }
}

export function stopSpeech() {
  currentlySpeakingText = null;
  updateTTSButtonState(false);

  const player = document.getElementById('global-tts-player');
  if (player) {
    try {
      player.pause();
      player.currentTime = 0;
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

function sanitizeTextForTTS(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '')
    .replace(/[^\p{L}\p{N}\s.,?!،؟-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakWithWebSpeech(cleanText) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const sanitized = sanitizeTextForTTS(cleanText);
    const truncated = (sanitized || cleanText).slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(truncated);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const arVoice = voices.find(v => v.lang && (v.lang.startsWith('ar') || v.lang.includes('ar')));
      if (arVoice) {
        utterance.voice = arVoice;
      }
    }

    utterance.onend = () => {
      currentlySpeakingText = null;
      updateTTSButtonState(false);
    };
    utterance.onerror = (e) => {
      console.warn('WebSpeech utterance error:', e);
      currentlySpeakingText = null;
      updateTTSButtonState(false);
    };

    window.speechSynthesis.speak(utterance);
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    updateTTSButtonState(true);
    return true;
  } catch (err) {
    console.warn('WebSpeech exception:', err);
    return false;
  }
}

export function speakText(text) {
  if (!text || !text.trim()) return;
  if (state.studentSession && state.studentSession.soundMuted) {
    stopSpeech();
    return;
  }

  const cleanText = sanitizeTextForTTS(text);
  if (!cleanText) return;

  let player = document.getElementById('global-tts-player');
  if (!player) {
    player = document.createElement('audio');
    player.id = 'global-tts-player';
    player.className = 'hidden';
    document.body.appendChild(player);
  }

  // Toggle off if exact same text is currently playing or speaking
  const isWebSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  const isAudioPlaying = player && !player.paused;

  if (currentlySpeakingText === cleanText && (isAudioPlaying || isWebSpeaking)) {
    stopSpeech();
    return;
  }

  stopSpeech();
  currentlySpeakingText = cleanText;
  playSound('select');
  updateTTSButtonState(true);

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : '';

  const truncated = cleanText.slice(0, 200);
  const ttsUrl = `${API_BASE}/api/tts?text=${encodeURIComponent(truncated)}`;

  player.crossOrigin = 'anonymous';
  player.src = ttsUrl;
  player.currentTime = 0;

  player.onended = () => {
    if (currentlySpeakingText === cleanText) {
      currentlySpeakingText = null;
      updateTTSButtonState(false);
    }
  };

  player.onerror = (e) => {
    console.warn('HTML5 Audio player error, trying WebSpeech fallback:', e);
    const fallbackOk = speakWithWebSpeech(cleanText);
    if (!fallbackOk) {
      currentlySpeakingText = null;
      updateTTSButtonState(false);
    }
  };

  const playPromise = player.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn('HTML5 Audio play prevented, trying WebSpeech fallback:', err);
      const fallbackOk = speakWithWebSpeech(cleanText);
      if (!fallbackOk) {
        currentlySpeakingText = null;
        updateTTSButtonState(false);
      }
    });
  }
}




