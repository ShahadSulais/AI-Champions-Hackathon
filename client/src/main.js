import { DEMO_LESSON } from '../data/demoLesson.js';
import { getMemory } from '../services/memoryService.js';
import { playSound, speakText } from '../services/audioService.js';
import { fetchGenerateGame } from '../api/gameApi.js';
import { state } from '../state/gameState.js';
import { openSettingsModal, closeSettingsModal, handleClearMemory } from '../ui/modal.js';
import { switchScreen, initIntroScreen, showTeacherReport, returnToEnding, resetGameSession } from '../ui/screens.js';
import { startGameplay, toggleHint } from '../game/gameSession.js';

document.addEventListener('DOMContentLoaded', () => {
  const setupForm = document.getElementById('setup-form');
  const generateBtn = document.getElementById('generate-btn');
  const errorContainer = document.getElementById('error-container');
  const errorMessageText = document.getElementById('error-message-text');
  const retryBtn = document.getElementById('retry-btn');

  // Modal listeners
  document.getElementById('header-memory-btn')?.addEventListener('click', openSettingsModal);
  document.getElementById('modal-close-btn')?.addEventListener('click', closeSettingsModal);
  document.getElementById('modal-close-footer-btn')?.addEventListener('click', closeSettingsModal);
  document.getElementById('clear-memory-btn')?.addEventListener('click', handleClearMemory);

  // Demo lesson loader
  document.getElementById('demo-lesson-btn')?.addEventListener('click', () => {
    document.getElementById('lesson-title').value = DEMO_LESSON.title;
    document.getElementById('student-age').value = DEMO_LESSON.age;
    document.getElementById('lesson-text').value = DEMO_LESSON.text;
    if (errorContainer) errorContainer.classList.add('hidden');
    playSound('select');
  });

  // Setup form submit handler
  async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    const lessonTitle = document.getElementById('lesson-title').value.trim();
    const studentLevel = document.getElementById('student-age').value.trim();
    const lessonText = document.getElementById('lesson-text').value.trim();
    const storyTheme = document.querySelector('input[name="story-theme"]:checked')?.value || 'مدينة مستقبلية';

    if (!lessonTitle || !studentLevel || !lessonText) {
      alert("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    // Hide previous errors & disable generate button to prevent duplicate submissions
    if (errorContainer) errorContainer.classList.add('hidden');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    switchScreen('screen-loading');
    document.getElementById('loading-status-text').innerText = "تحليل النص واستدعاء الذاكرة التكيفية عبر محرك Gemini الذكي...";

    try {
      const memory = getMemory();
      state.gameState = await fetchGenerateGame({
        lessonTitle,
        studentLevel,
        lessonText,
        storyTheme,
        memory
      });

      initIntroScreen();
      switchScreen('screen-intro');
    } catch (err) {
      console.error('Generation Failed:', err);

      if (errorMessageText) {
        errorMessageText.innerText = err.message || 'حدث خطأ أثناء الاتصال بالمحرك الذكي.';
      }
      if (errorContainer) {
        errorContainer.classList.remove('hidden');
      }

      switchScreen('screen-setup');
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  setupForm?.addEventListener('submit', handleFormSubmit);
  retryBtn?.addEventListener('click', () => handleFormSubmit());

  // Intro screen listeners
  document.getElementById('intro-speak-btn')?.addEventListener('click', () => {
    const text = state.gameState ? `${state.gameState.gameTitle}. ${state.gameState.introduction}.` : "";
    speakText(text);
  });

  document.getElementById('start-mission-btn')?.addEventListener('click', () => {
    const lessonTitle = document.getElementById('lesson-title').value || "درس معرفي";
    startGameplay(lessonTitle);
  });

  // Active game screen listeners
  document.getElementById('hint-btn')?.addEventListener('click', () => toggleHint(false));
  document.getElementById('scene-speak-btn')?.addEventListener('click', () => {
    if (state.currentSceneData) {
      speakText(`${state.currentSceneData.title}. ${state.currentSceneData.narration}`);
    }
  });

  // Ending screen listeners
  document.getElementById('ending-report-btn')?.addEventListener('click', showTeacherReport);
  document.getElementById('ending-new-adventure-btn')?.addEventListener('click', resetGameSession);

  // Report screen listeners
  document.getElementById('report-back-btn')?.addEventListener('click', returnToEnding);
  document.getElementById('report-print-btn')?.addEventListener('click', () => window.print());
});
