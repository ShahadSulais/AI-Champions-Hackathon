import { DEMO_LESSON } from '../data/demoLesson.js';
import { getMemory } from '../services/memoryService.js';
import { playSound, speakText, stopSpeech } from '../services/audioService.js';
import { fetchGenerateGame, fetchExtractTextFromImage, fetchGenerateRealmsGame } from '../api/gameApi.js';
import { state } from '../state/gameState.js';
import { openSettingsModal, closeSettingsModal, handleClearMemory, handleSaveSettings, handleClearSettings, toggleKeyVisibility } from '../ui/modal.js';
import { switchScreen, initIntroScreen, showTeacherReport, returnToEnding, resetGameSession, initBriefingScreen, initStoryIntroScreen, advanceStoryScene, previousStoryScene, getActiveStoryScene, applyThemeSkin } from '../ui/screens.js';
import { initKnowledgeScanner, stopKnowledgeScanner } from '../ui/knowledgeScanner.js';

import { startGameplay, toggleHint } from '../game/gameSession.js';
import { REALMS_FALLBACK_DATA } from '../data/realmsFallback.js';
import { initRealmsSession } from '../game/realmsSession.js';
import { renderRealmsOverlay } from '../game/realmsQuestionOverlay.js';
import { renderKnowledgeMaze } from '../game/realms/knowledgeMaze.js';
import { renderSkyIslands } from '../game/realms/skyIslands.js';
import { renderCosmicRacer } from '../game/realms/cosmicRacer.js';
import { renderNinjaGuardian } from '../game/realms/ninjaGuardian.js';







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
      counterEl.textContent = `${len} / 10000 حرف`;
      if (len < 50) {
        counterEl.className = 'text-xs text-amber-400 font-mono';
      } else if (len > 10000) {
        counterEl.className = 'text-xs text-red-400 font-mono font-bold';
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

  // Canvas Image Resizer Helper (compresses large camera photos to max 1600px)
  async function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

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
        if (fileUploadStatusText) fileUploadStatusText.textContent = `جارِ تحليل الضغط واستخراج النص من الصورة عبر الذكاء الاصطناعي...`;
        
        const { base64, mimeType } = await compressImageFile(file);

        extractedText = await fetchExtractTextFromImage({
          imageBase64: base64,
          mimeType
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

      if (extractedText && extractedText.length > 9500) {
        extractedText = extractedText.slice(0, 9500) + '\n\n[ملاحظة: تم اقتطاع باقي النص تلقائياً ليلائم الحد الأقصى المسموح به للنظام]';
      }

      if (lessonTextEl && extractedText) {
        lessonTextEl.value = extractedText.trim();
        updateCharacterCount();
        if (validationMsg) validationMsg.classList.add('hidden');
        playSound('select');

        // Check for multiple lessons inside uploaded text
        checkAndHandleMultiLessons(extractedText);
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

  // Multi-Lesson Detection & Selection Handler
  let detectedMultiLessons = [];
  function checkAndHandleMultiLessons(text) {
    if (!text || text.length < 100) return false;

    const lessonPattern = /(?:الدرس|الفصل|الوحدة|الموضوع|Lesson|Chapter)\s*(?:[1-9]|10|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)[^\n]*/gi;
    const matches = Array.from(text.matchAll(lessonPattern));

    if (matches.length >= 2) {
      detectedMultiLessons = matches.map((match, idx) => {
        const title = match[0].trim();
        const startPos = match.index;
        const endPos = (idx < matches.length - 1) ? matches[idx + 1].index : text.length;
        const content = text.slice(startPos, endPos).trim();
        return { title, content };
      });

      openMultiLessonModal();
      return true;
    }
    return false;
  }

  function openMultiLessonModal() {
    const modal = document.getElementById('multi-lesson-modal');
    const listContainer = document.getElementById('multi-lesson-list');
    if (!modal || !listContainer) return;

    listContainer.replaceChildren();
    detectedMultiLessons.forEach((item, index) => {
      const label = document.createElement('label');
      label.className = 'block bg-slate-950 border border-slate-800 hover:border-purple-600/80 p-3 rounded-xl cursor-pointer transition';
      label.innerHTML = `
        <div class="flex items-center gap-2.5">
          <input type="radio" name="multi-lesson-choice" value="${index}" ${index === 0 ? 'checked' : ''} class="text-purple-600 focus:ring-purple-500">
          <div>
            <span class="text-xs font-bold text-purple-300 block">${item.title}</span>
            <p class="text-[11px] text-slate-400 line-clamp-2 mt-0.5">${item.content.slice(0, 120)}...</p>
          </div>
        </div>
      `;
      listContainer.appendChild(label);
    });

    modal.classList.remove('hidden');
  }

  function closeMultiLessonModal() {
    const modal = document.getElementById('multi-lesson-modal');
    if (modal) modal.classList.add('hidden');
  }

  document.getElementById('multi-lesson-close-btn')?.addEventListener('click', closeMultiLessonModal);
  document.getElementById('multi-lesson-cancel-btn')?.addEventListener('click', closeMultiLessonModal);
  document.getElementById('confirm-selected-lesson-btn')?.addEventListener('click', () => {
    const checked = document.querySelector('input[name="multi-lesson-choice"]:checked');
    if (checked) {
      const idx = parseInt(checked.value, 10);
      const chosen = detectedMultiLessons[idx];
      if (chosen && lessonTextEl) {
        lessonTextEl.value = chosen.content;
        const titleInput = document.getElementById('lesson-title');
        if (titleInput && (!titleInput.value.trim() || titleInput.value.startsWith('درس'))) {
          titleInput.value = chosen.title;
        }
        updateCharacterCount();
      }
    }
    closeMultiLessonModal();
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

  let currentRealmsData = null;
  let activeLessonTitle = '';
  let cachedLessonBriefing = null;
  let cachedStoryIntro = null;
  let cachedLessonTitleKey = '';
  let cachedLessonTextKey = '';

  // Form submit handler with validation & stage loading
  async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    const lessonTitle = document.getElementById('lesson-title')?.value.trim() || '';
    const studentLevel = document.getElementById('student-age')?.value.trim() || '';
    const lessonText = lessonTextEl?.value.trim() || '';
    const storyTheme = document.querySelector('input[name="story-theme"]:checked')?.value || 'مدينة مستقبلية';
    applyThemeSkin(storyTheme);

    activeLessonTitle = lessonTitle;

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

    // Check for cached briefing & story to prevent unnecessary regeneration
    if (cachedLessonTitleKey === lessonTitle && cachedLessonTextKey === lessonText && cachedLessonBriefing && cachedStoryIntro) {
      initBriefingScreen(cachedLessonBriefing);
      switchScreen('screen-briefing');
      return;
    }

    // Set button loading state & prevent duplicate submission
    if (generateBtn) generateBtn.disabled = true;
    if (generateSpinner) generateSpinner.classList.remove('hidden');
    if (generateBtnText) generateBtnText.textContent = 'جارِ التحليل والتوليد...';
    if (generateBtnIcon) generateBtnIcon.classList.add('hidden');

    switchScreen('screen-loading');
    initKnowledgeScanner();

    try {
      const memory = getMemory();
      if (storyTheme === 'بوابة الأكوان' || storyTheme === 'عالم الألعاب') {
        const realmsAiData = await fetchGenerateRealmsGame({
          lessonTitle,
          studentLevel,
          lessonText,
          storyTheme,
          memory
        });

        currentRealmsData = realmsAiData || { ...REALMS_FALLBACK_DATA, title: `مهمة ${lessonTitle} - عالم الأكوان الأركيدية` };
        cachedLessonBriefing = currentRealmsData.lesson || DEMO_LESSON.lesson;
        cachedStoryIntro = currentRealmsData.story || DEMO_LESSON.story;
      } else {
        state.gameState = await fetchGenerateGame({
          lessonTitle,
          studentLevel,
          lessonText,
          storyTheme,
          memory
        });

        cachedLessonBriefing = state.gameState.lesson || DEMO_LESSON.lesson;
        cachedStoryIntro = state.gameState.story || DEMO_LESSON.story;
      }

      cachedLessonTitleKey = lessonTitle;
      cachedLessonTextKey = lessonText;

      stopKnowledgeScanner();

      // Show Lesson Briefing screen
      initBriefingScreen(cachedLessonBriefing);
      switchScreen('screen-briefing');

    } catch (err) {
      stopKnowledgeScanner();
      console.error('Generation Failed:', err);

      if (errorMessageText) {
        errorMessageText.innerText = err.message || 'حدث خطأ غير متوقع أثناء توليد المغامرة.';
      }
      if (errorContainer) {
        errorContainer.classList.remove('hidden');
      }

      switchScreen('screen-setup');
    } finally {
      stopKnowledgeScanner();
      if (generateBtn) generateBtn.disabled = false;
      if (generateSpinner) generateSpinner.classList.add('hidden');
      if (generateBtnText) generateBtnText.textContent = 'توليد المغامرة التكيفية والموجز';
      if (generateBtnIcon) generateBtnIcon.classList.remove('hidden');
    }
  }

  // Briefing Screen Control Listeners
  document.getElementById('briefing-read-aloud-btn')?.addEventListener('click', () => {
    const briefing = cachedLessonBriefing || state.gameState?.lesson || DEMO_LESSON.lesson;
    if (!briefing) return;
    const textToRead = `${briefing.title || ''}. ${briefing.summary || ''}. النقاط الأساسية: ${ (briefing.keyPoints || []).join('. ') }`;
    speakText(textToRead);
  });


  document.getElementById('briefing-simplify-btn')?.addEventListener('click', () => {
    if (!cachedLessonBriefing) return;
    playSound('select');

    // Create a simplified reading version
    const simplifiedData = {
      ...cachedLessonBriefing,
      summary: `نسخة مبسطة: ${cachedLessonBriefing.summary.replace(/(والتي|تكون|حيث إن|بالإضافة إلى)/g, '')}`,
      keyPoints: (cachedLessonBriefing.keyPoints || []).slice(0, 4)
    };

    initBriefingScreen(simplifiedData);
  });

  document.getElementById('briefing-back-btn')?.addEventListener('click', () => {
    playSound('select');
    switchScreen('screen-setup');
  });

  document.getElementById('briefing-ready-btn')?.addEventListener('click', () => {
    playSound('select');
    if (!cachedStoryIntro) {
      cachedStoryIntro = state.gameState?.story || DEMO_LESSON.story;
    }

    initStoryIntroScreen(cachedStoryIntro, () => {
      launchTargetGame();
    });
    switchScreen('screen-story-intro');
  });

  // Story Screen Controls
  document.getElementById('story-next-btn')?.addEventListener('click', advanceStoryScene);
  document.getElementById('story-prev-btn')?.addEventListener('click', previousStoryScene);
  document.getElementById('story-skip-btn')?.addEventListener('click', () => {
    playSound('select');
    launchTargetGame();
  });

  document.getElementById('story-read-aloud-btn')?.addEventListener('click', () => {
    const scene = getActiveStoryScene();
    if (!scene) return;
    const textToRead = `${scene.narration || ''}. ${scene.dialogue ? 'وحوار الشخصية: ' + scene.dialogue : ''}`;
    speakText(textToRead);
  });

  document.getElementById('story-sound-toggle-btn')?.addEventListener('click', () => {
    state.studentSession.soundMuted = !state.studentSession.soundMuted;
    const isMuted = state.studentSession.soundMuted;

    if (isMuted) {
      stopSpeech();
    } else {
      playSound('select');
    }

    const icon = document.getElementById('story-sound-icon');
    if (icon) icon.textContent = isMuted ? '🔇' : '🔊';

    const gameSoundBtn = document.getElementById('sound-toggle-btn');
    if (gameSoundBtn) {
      gameSoundBtn.replaceChildren();
      const span = document.createElement('span');
      span.textContent = isMuted ? '🔇' : '🔊';
      gameSoundBtn.appendChild(span);
    }
  });

  let reducedMotionEnabled = false;
  document.getElementById('story-reduced-motion-btn')?.addEventListener('click', () => {
    reducedMotionEnabled = !reducedMotionEnabled;
    if (reducedMotionEnabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    playSound('select');
  });

  function launchTargetGame() {
    const storyTheme = document.querySelector('input[name="story-theme"]:checked')?.value || 'مدينة مستقبلية';
    if (storyTheme === 'بوابة الأكوان' || storyTheme === 'عالم الألعاب') {
      openRealmsWorldScreen();
    } else {
      const lessonTitle = document.getElementById('lesson-title')?.value || "درس معرفي";
      startGameplay(lessonTitle);
    }
  }


  setupForm?.addEventListener('submit', handleFormSubmit);
  retryBtn?.addEventListener('click', () => handleFormSubmit());


  // Bind Portal of Realms World Selector Buttons
  document.querySelectorAll('.start-realm-world-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const worldId = e.currentTarget.dataset.realmWorld || 'maze';
      playSound('select');

      function launchWorld(targetWorldId) {
        initRealmsSession({
          lessonTitle: activeLessonTitle || 'مهمة حُرّاس الأكوان',
          selectedWorld: targetWorldId,
          realmsData: currentRealmsData || REALMS_FALLBACK_DATA
        });

        switchScreen('screen-realms-game');

        const overlayContainer = document.getElementById('realms-overlay-container');
        if (targetWorldId === 'maze') {
          renderKnowledgeMaze(
            overlayContainer,
            () => launchWorld('sky_islands'),
            () => switchScreen('screen-realms-worlds')
          );
        } else if (targetWorldId === 'sky_islands') {
          renderSkyIslands(
            overlayContainer,
            () => launchWorld('cosmic_racer'),
            () => switchScreen('screen-realms-worlds')
          );
        } else if (targetWorldId === 'cosmic_racer') {
          renderCosmicRacer(
            overlayContainer,
            () => launchWorld('ninja_guardian'),
            () => switchScreen('screen-realms-worlds')
          );
        } else if (targetWorldId === 'ninja_guardian') {
          renderNinjaGuardian(
            overlayContainer,
            () => switchScreen('screen-realms-worlds'),
            () => switchScreen('screen-realms-worlds')
          );
        } else {
          renderRealmsOverlay(
            overlayContainer,
            () => switchScreen('screen-realms-worlds'),
            () => switchScreen('screen-realms-worlds')
          );
        }
      }

      launchWorld(worldId);
    });
  });



  function openRealmsWorldScreen() {
    playSound('select');
    const lessonTitle = document.getElementById('lesson-title')?.value.trim() || 'درس المعرفة';
    const storyTheme = document.querySelector('input[name="story-theme"]:checked')?.value || 'مدينة مستقبلية';
    const studentLevel = document.getElementById('student-age')?.value.trim() || 'المستوى الابتدائي';
    const lessonText = lessonTextEl?.value.trim() || '';

    activeLessonTitle = lessonTitle;
    currentRealmsData = { ...REALMS_FALLBACK_DATA, title: `مهمة ${lessonTitle} - عالم الأكوان والألعاب` };

    const titleDisp = document.getElementById('realms-lesson-title-display');
    if (titleDisp) titleDisp.textContent = currentRealmsData.title;

    const introDisp = document.getElementById('realms-mission-intro-display');
    if (introDisp) introDisp.textContent = `خوض العوالم التفاعلية الأربعة بالترتيب لدرس (${lessonTitle})`;

    const themeBadge = document.getElementById('realms-theme-badge');
    if (themeBadge) themeBadge.textContent = storyTheme;

    const storyTextDisp = document.getElementById('realms-story-text-display');
    if (storyTextDisp) {
      storyTextDisp.textContent = `في عوالم (${storyTheme})، يخوض بطلنا "حارس النور" مهمة أركيدية سريعة لتعزيز الفهم المفاهيمي لدرس (${lessonTitle}). اجتاز الأكوان الأربعة المتتالية واجمع شظايا المعرفة لإعادة التوازن!`;
    }

    switchScreen('screen-realms-worlds');

    // Background AI generation without blocking UI
    if (lessonText && lessonText.length >= 15) {
      fetchGenerateRealmsGame({
        lessonTitle,
        studentLevel,
        lessonText,
        storyTheme,
        memory: getMemory()
      }).then(aiData => {
        if (aiData && Array.isArray(aiData.questions) && aiData.questions.length > 0) {
          currentRealmsData = aiData;
          if (titleDisp) titleDisp.textContent = aiData.title || `مهمة ${lessonTitle}`;
          if (storyTextDisp && aiData.intro) storyTextDisp.textContent = aiData.intro;
        }
      }).catch(err => {
        console.warn('Realms background AI load used fallback:', err);
      });
    }
  }

  document.getElementById('generate-realms-btn')?.addEventListener('click', openRealmsWorldScreen);
  document.getElementById('header-realms-instant-btn')?.addEventListener('click', openRealmsWorldScreen);




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

