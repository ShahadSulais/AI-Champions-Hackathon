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
    hasSavedMemory: false
  },
  currentSceneData: null,
  interactiveData: {},
  selectedClassItem: null
};

export function resetStudentSession(lessonTitle = "درس معرفي") {
  state.studentSession = {
    lessonTitle,
    attempts: {},
    results: {},
    answers: {},
    hintsUsed: 0,
    struggledScenesCount: 0,
    adaptedDifficulty: null,
    hasSavedMemory: false
  };
  state.currentSceneIndex = 0;
}
