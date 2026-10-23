import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const petsCatalog = JSON.parse(
  readFileSync(join(__dirname, "../../data/pets.json"), "utf8")
);

/** In-memory progress — swap for DB when persistence is decided (PLAN Gaps). */
const users = new Map();

const POINTS = {
  sentenceCorrect: 20,
  firstTryBonus: 10,
  dailyCheckIn: 15,
};

function defaultUser(userId) {
  return {
    userId,
    points: 0,
    petId: "tugou-dog",
    completedExerciseIds: [],
    lastCheckInDate: null,
  };
}

export function getUser(userId = "demo") {
  if (!users.has(userId)) users.set(userId, defaultUser(userId));
  return users.get(userId);
}

export function resolvePetState(user) {
  const pet = petsCatalog.pets.find((p) => p.id === user.petId) || petsCatalog.pets[0];
  let stage = pet.stages[0];
  for (const s of pet.stages) {
    if (user.points >= s.xpRequired) stage = s;
  }
  return {
    petId: pet.id,
    nameZh: pet.nameZh,
    nameEn: pet.nameEn,
    speciesZh: pet.speciesZh,
    points: user.points,
    stage: {
      level: stage.level,
      titleZh: stage.titleZh,
      titleEn: stage.titleEn,
      image: `/${stage.image}`,
      xpRequired: stage.xpRequired,
    },
    nextXp: (() => {
      const next = pet.stages.find((s) => s.xpRequired > user.points);
      return next ? next.xpRequired : null;
    })(),
  };
}

export function awardExercise(userId, { exerciseKey, firstTry }) {
  const user = getUser(userId);
  let gained = 0;
  if (!user.completedExerciseIds.includes(exerciseKey)) {
    gained = POINTS.sentenceCorrect + (firstTry ? POINTS.firstTryBonus : 0);
    user.points += gained;
    user.completedExerciseIds.push(exerciseKey);
  }
  return { gained, alreadyDone: gained === 0, pet: resolvePetState(user), points: POINTS };
}

export function dailyCheckIn(userId) {
  const user = getUser(userId);
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastCheckInDate === today) {
    return { gained: 0, alreadyCheckedIn: true, pet: resolvePetState(user) };
  }
  user.lastCheckInDate = today;
  user.points += POINTS.dailyCheckIn;
  return { gained: POINTS.dailyCheckIn, alreadyCheckedIn: false, pet: resolvePetState(user) };
}

export { POINTS };
