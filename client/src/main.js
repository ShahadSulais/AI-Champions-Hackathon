import { DEMO_LESSON } from '../data/demoLesson.js';
import { getMemory } from '../services/memoryService.js';
import { playSound, speakText } from '../services/audioService.js';
import { fetchGenerateGame, fetchExtractTextFromImage } from '../api/gameApi.js';
import { state } from '../state/gameState.js';
import { openSettingsModal, closeSettingsModal, handleClearMemory, handleSaveSettings, handleClearSettings, toggleKeyVisibility } from '../ui/modal.js';
import { switchScreen, initIntroScreen, showTeacherReport, returnToEnding, resetGameSession } from '../ui/screens.js';
import { startGameplay, toggleHint } from '../game/gameSession.js';

document.addEventListener('DOMContentLoaded', () => {
  const setupForm = document.getElementById('setup-form');
  const generateBtn = document.getElementById('generate-btn');
  const generateSpinner = document.getElementById('generate-btn-spinner');
  const generateBtnText = document.getElementById('generate-btn-text');
  const generateBtnIcon = document.getElementById('generate-btn-icon');
  
  const lessonTextEl = document.getElementById('lesson-text');
  const counterEl = document.getElementById('lesson-text-counter');
  const validationMsg = document.getElementById('setup-validation-msg');
  const validationText = document.getElementById('setup-validation-text');
  
  const errorContainer = document.getElementById('error-container');
  const errorMessageText = document.getElementById('error-message-text');
  const retryBtn = document.getElementById('retry-btn');

  const uploadFileBtn = document.getElementById('upload-file-btn');
  const lessonFileInput = document.getElementById('lesson-file-input');
  const fileUploadStatus = document.getElementById('file-upload-status');
  const fileUploadStatusText = document.getElementById('file-upload-status-text');

  // Character Counter Functionality
  function updateCharacterCount() {
    if (lessonTextEl && counterEl) {
      const len = lessonTextEl.value.length;
      counterEl.textContent = `${len} / 2000 حرف`;
      if (len < 50) {
        counterEl.className = 'text-xs text-amber-400 font-mono';
      } else {
        counterEl.className = 'text-xs text-purple-300 font-mono';
      }
    }
  }

  if (lessonTextEl) {
    lessonTextEl.addEventListener('input', updateCharacterCount);
    updateCharacterCount();
  }

  // Modal listeners
  document.getElementById('header-memory-btn')?.addEventListener('click', openSettingsModal);
  document.getElementById('modal-close-btn')?.addEventListener('click', closeSettingsModal);
  document.getElementById('modal-close-footer-btn')?.addEventListener('click', closeSettingsModal);
  document.getElementById('clear-memory-btn')?.addEventListener('click', handleClearMemory);
  document.getElementById('save-settings-btn')?.addEventListener('click', handleSaveSettings);
  document.getElementById('clear-settings-btn')?.addEventListener('click', handleClearSettings);
  document.getElementById('toggle-key-visibility-btn')?.addEventListener('click', toggleKeyVisibility);

  // File Upload Handler (PDF, Image OCR, TXT)
  uploadFileBtn?.addEventListener('click', () => {
    lessonFileInput?.click();
  });

  lessonFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileUploadStatus) fileUploadStatus.classList.remove('hidden');
    if (fileUploadStatusText) fileUploadStatusText.textContent = `جارِ قراءة واستخراج المحتوى من: ${file.name}...`;

    try {
      let extractedText = '';

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (!window.pdfjsLib) {
          throw new Error('مكتبة PDF.js غير محملة بعد، يرجى إعادة تحديث الصفحة.');
        }
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tokenContent = await page.getTextContent();
          const pageText = tokenContent.items.map(item => item.str).join(' ');
          if (pageText.trim()) pageTexts.push(pageText.trim());
        }

        extractedText = pageTexts.join('\n\n');
        if (!extractedText.trim()) {
          throw new Error('لم يتم العثور على نص قابل للقراءة في ملف الـ PDF. قد تكون الصفحات عبارة عن صور مسحوبة.');
        }

      } else if (file.type.startsWith('image/')) {
        if (fileUploadStatusText) fileUploadStatusText.textContent = `جارِ استخراج النص العربي من الصورة عبر الذكاء الاصطناعي...`;
        
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result || '';
            const base64 = result.toString().split(',')[1] || '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        extractedText = await fetchExtractTextFromImage({
          imageBase64: base64Data,
          mimeType: file.type || 'image/png'
        });

      } else {
        // Plain text / Markdown
        extractedText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || '');
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      if (lessonTextEl && extractedText) {
        lessonTextEl.value = extractedText.trim();
        updateCharacterCount();
        if (validationMsg) validationMsg.classList.add('hidden');
        playSound('select');
      }

      if (fileUploadStatusText) fileUploadStatusText.textContent = `تم استخراج النص من (${file.name}) بنجاح ✓`;
      setTimeout(() => {
        if (fileUploadStatus) fileUploadStatus.classList.add('hidden');
      }, 3000);

    } catch (err) {
      console.error('File Upload Parsing Error:', err);
      if (fileUploadStatusText) fileUploadStatusText.textContent = `تعذر استخراج النص: ${err.message || 'حدث خطأ غير متوقع'}`;
      playSound('incorrect');
    } finally {
      lessonFileInput.value = '';
    }
  });

  // Demo lesson loader
  document.getElementById('demo-lesson-btn')?.addEventListener('click', () => {
    const titleInput = document.getElementById('lesson-title');
    const ageInput = document.getElementById('student-age');
    if (titleInput) titleInput.value = DEMO_LESSON.title;
    if (ageInput) ageInput.value = DEMO_LESSON.age;
    if (lessonTextEl) lessonTextEl.value = DEMO_LESSON.text;
    
    updateCharacterCount();
    if (validationMsg) validationMsg.classList.add('hidden');
    if (errorContainer) errorContainer.classList.add('hidden');
    playSound('select');
  });

  let stageInterval = null;

  // Form submit handler with validation & stage loading
  async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    const lessonTitle = document.getElementById('lesson-title')?.value.trim() || '';
    const studentLevel = document.getElementById('student-age')?.value.trim() || '';
    const lessonText = lessonTextEl?.value.trim() || '';
    const storyTheme = document.querySelector('input[name="story-theme"]:checked')?.value || 'مدينة مستقبلية';

    // Friendly validation check
    if (!lessonTitle || !studentLevel || !lessonText) {
      if (validationText && validationMsg) {
        validationText.textContent = "يرجى تعبئة كافة الحقول المطلوبة (عنوان الدرس، المستوى التعليمي، ونص الدرس).";
        validationMsg.classList.remove('hidden');
      }
      playSound('incorrect');
      return;
    }

    if (lessonText.length < 15) {
      if (validationText && validationMsg) {
        validationText.textContent = "يرجى إدخال نص درس كافٍ (15 حرفاً على الأقل) لتشخيص المغامرة.";
        validationMsg.classList.remove('hidden');
      }
      playSound('incorrect');
      return;
    }

    if (validationMsg) validationMsg.classList.add('hidden');
    if (errorContainer) errorContainer.classList.add('hidden');

    // Set button loading state & prevent duplicate submission
    if (generateBtn) generateBtn.disabled = true;
    if (generateSpinner) generateSpinner.classList.remove('hidden');
    if (generateBtnText) generateBtnText.textContent = 'جارِ التحليل والتوليد...';
    if (generateBtnIcon) generateBtnIcon.classList.add('hidden');

    switchScreen('screen-loading');

    // Stage updates without fake progress bars
    const stages = [
      "🔍 جارِ تحليل المفاهيم العلمية للدرس...",
      "🧠 استدعاء ذاكرة الطالب التكيفية والسياق السابق...",
      "⚔️ صياغة المشاهد التفاعلية وتحديات المغامرة..."
    ];
    let currentStage = 0;
    const statusTextEl = document.getElementById('loading-status-text');
    if (statusTextEl) statusTextEl.textContent = stages[0];

    stageInterval = setInterval(() => {
      currentStage = (currentStage + 1) % stages.length;
      if (statusTextEl) statusTextEl.textContent = stages[currentStage];
    }, 2800);

    try {
      const memory = getMemory();
      state.gameState = await fetchGenerateGame({
        lessonTitle,
        studentLevel,
        lessonText,
        storyTheme,
        memory
      });

      clearInterval(stageInterval);
      initIntroScreen();
      switchScreen('screen-intro');
    } catch (err) {
      clearInterval(stageInterval);
      console.error('Generation Failed:', err);

      if (errorMessageText) {
        errorMessageText.innerText = err.message || 'حدث خطأ غير متوقع أثناء توليد المغامرة.';
      }
      if (errorContainer) {
        errorContainer.classList.remove('hidden');
      }

      switchScreen('screen-setup');
    } finally {
      clearInterval(stageInterval);
      if (generateBtn) generateBtn.disabled = false;
      if (generateSpinner) generateSpinner.classList.add('hidden');
      if (generateBtnText) generateBtnText.textContent = 'توليد المغامرة التكيفية';
      if (generateBtnIcon) generateBtnIcon.classList.remove('hidden');
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
    const lessonTitle = document.getElementById('lesson-title')?.value || "درس معرفي";
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

