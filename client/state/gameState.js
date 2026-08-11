export const state = {
  gameState: {},
  currentSceneIndex: 0,
  studentSession: {
    lessonTitle: "",
    attempts: {},
    results: {},
    answers: {},
    hintsUsed: 0,
    struggledScenesCount: 0,
    adaptedDifficulty: null,
    hasSavedMemory: false,
    score: 0,
    streak: 0,
    maxStreak: 0,
    soundMuted: false
  },
  currentSceneData: null,
  interactiveData: {},
  selectedClassItem: null
};

export function resetStudentSession(lessonTitle = "درس معرفي") {
  const previousSoundMuted = state.studentSession?.soundMuted || false;
  state.studentSession = {
    lessonTitle,
    attempts: {},
    results: {},
    answers: {},
    hintsUsed: 0,
    struggledScenesCount: 0,
    adaptedDifficulty: null,
    hasSavedMemory: false,
    score: 0,
    streak: 0,
    maxStreak: 0,
    soundMuted: previousSoundMuted
  };
  state.currentSceneIndex = 0;
}
