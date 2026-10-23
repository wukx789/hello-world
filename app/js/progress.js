const STORAGE_KEY = "juwo-progress-v1";

const defaultState = () => ({
  petId: "tugou-dog",
  xp: 0,
  completedSentenceIds: [],
  lastCheckInDate: null,
});

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function saveProgress(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function awardSentenceXp(state, { sentenceKey, xp, firstTry }) {
  const next = {
    ...state,
    completedSentenceIds: state.completedSentenceIds.includes(sentenceKey)
      ? state.completedSentenceIds
      : [...state.completedSentenceIds, sentenceKey],
    xp: state.xp + xp + (firstTry ? 0 : 0),
    lastCheckInDate: todayKey(),
  };
  // firstTry bonus already baked into xp by caller
  return next;
}

/** Resolve pet stage from pets.json stages by xpRequired. */
export function resolveStage(pet, xp) {
  const stages = pet?.stages || [];
  let current = stages[0] || null;
  for (const stage of stages) {
    if (xp >= stage.xpRequired) current = stage;
  }
  return current;
}
