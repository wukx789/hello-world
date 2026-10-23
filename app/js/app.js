import { tokenize, scramble, tokensMatch, joinTokens } from "./scramble.js";
import { loadProgress, saveProgress, resolveStage } from "./progress.js";

const state = {
  lessons: null,
  pets: null,
  articleIndex: 0,
  sentenceIndex: 0,
  answer: [],
  bank: [],
  attempts: 0,
  progress: loadProgress(),
  drag: null,
};

const els = {
  articleNav: document.querySelector("#article-nav"),
  masthead: document.querySelector("#masthead"),
  progressRow: document.querySelector("#progress-row"),
  slots: document.querySelector("#slots"),
  bank: document.querySelector("#bank"),
  feedback: document.querySelector("#feedback"),
  checkBtn: document.querySelector("#check-btn"),
  resetBtn: document.querySelector("#reset-btn"),
  nextBtn: document.querySelector("#next-btn"),
  petImg: document.querySelector("#pet-img"),
  petName: document.querySelector("#pet-name"),
  petXp: document.querySelector("#pet-xp"),
  toast: document.querySelector("#xp-toast"),
};

async function boot() {
  const [lessons, pets] = await Promise.all([
    fetch("../data/lessons.json").then((r) => r.json()),
    fetch("../data/pets.json").then((r) => r.json()),
  ]);
  state.lessons = lessons;
  state.pets = pets;
  renderArticleNav();
  loadSentence(true);
  bindActions();
  updatePetHud();
}

function currentArticle() {
  return state.lessons.articles[state.articleIndex];
}

function currentSentence() {
  return currentArticle().sentences[state.sentenceIndex];
}

function sentenceKey() {
  return `${currentArticle().id}:${currentSentence().id}`;
}

function renderArticleNav() {
  els.articleNav.innerHTML = state.lessons.articles
    .map(
      (article, i) => `
      <button type="button" data-article="${i}" class="${i === state.articleIndex ? "active" : ""}">
        ${article.source}
      </button>`
    )
    .join("");

  els.articleNav.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.articleIndex = Number(btn.dataset.article);
      state.sentenceIndex = 0;
      renderArticleNav();
      loadSentence(true);
    });
  });
}

function renderMasthead() {
  const article = currentArticle();
  const sentenceNo = state.sentenceIndex + 1;
  const total = article.sentences.length;
  els.masthead.innerHTML = `
    <div class="kicker">${article.source} · ${article.section} · 第 ${sentenceNo}/${total} 句</div>
    <h2>${article.headline}</h2>
    <p>${article.headlineZh} · ${article.dekZh}</p>
  `;
}

function renderProgressDots() {
  const article = currentArticle();
  els.progressRow.innerHTML = article.sentences
    .map((_, i) => {
      const key = `${article.id}:${article.sentences[i].id}`;
      const done = state.progress.completedSentenceIds.includes(key);
      const current = i === state.sentenceIndex ? "current" : "";
      return `<div class="dot ${done ? "done" : ""} ${current}" title="句子 ${i + 1}"></div>`;
    })
    .join("");
}

function loadSentence(reshuffle) {
  const sentence = currentSentence();
  const tokens = tokenize(sentence.en);
  state.answer = Array(tokens.length).fill(null);
  state.bank = scramble(tokens).map((text, i) => ({ id: `b-${i}-${text}`, text }));
  state.attempts = 0;
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
  els.nextBtn.hidden = true;
  els.checkBtn.disabled = false;
  renderMasthead();
  renderProgressDots();
  renderBoard();
}

function renderBoard() {
  const slotCount = state.answer.length;
  els.slots.innerHTML = "";
  for (let i = 0; i < slotCount; i += 1) {
    const slot = document.createElement("div");
    slot.className = `slot ${state.answer[i] ? "filled" : ""}`;
    slot.dataset.slotIndex = String(i);
    if (state.answer[i]) {
      slot.appendChild(makeChip(state.answer[i], "answer"));
    }
    els.slots.appendChild(slot);
  }

  els.bank.innerHTML = "";
  state.bank.forEach((item) => {
    els.bank.appendChild(makeChip(item, "bank"));
  });
}

function makeChip(item, origin) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip";
  btn.textContent = item.text;
  btn.dataset.id = item.id;
  btn.dataset.origin = origin;
  attachPointerDrag(btn, item, origin);
  return btn;
}

function attachPointerDrag(el, item, origin) {
  el.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.classList.add("ghost");
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);
    el.classList.add("dragging");

    state.drag = {
      item,
      origin,
      fromSlot: origin === "answer" ? Number(el.closest(".slot").dataset.slotIndex) : null,
      ghost,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    el.setPointerCapture(event.pointerId);
  });

  el.addEventListener("pointermove", (event) => {
    if (!state.drag || state.drag.item.id !== item.id) return;
    const { ghost, offsetX, offsetY } = state.drag;
    ghost.style.left = `${event.clientX - offsetX}px`;
    ghost.style.top = `${event.clientY - offsetY}px`;
  });

  el.addEventListener("pointerup", (event) => finishDrag(event));
  el.addEventListener("pointercancel", (event) => finishDrag(event));
}

function finishDrag(event) {
  if (!state.drag) return;
  const drag = state.drag;
  state.drag = null;
  drag.ghost.remove();
  document.querySelectorAll(".chip.dragging").forEach((n) => n.classList.remove("dragging"));

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const slot = target?.closest?.(".slot");
  const bank = target?.closest?.("#bank");

  if (slot) {
    placeIntoSlot(drag, Number(slot.dataset.slotIndex));
  } else if (bank || drag.origin === "answer") {
    returnToBank(drag);
  }
  renderBoard();
}

function placeIntoSlot(drag, slotIndex) {
  const existing = state.answer[slotIndex];

  if (drag.origin === "answer") {
    state.answer[drag.fromSlot] = null;
  } else {
    state.bank = state.bank.filter((x) => x.id !== drag.item.id);
  }

  if (existing) {
    if (drag.origin === "answer") {
      state.answer[drag.fromSlot] = existing;
    } else {
      state.bank.push(existing);
    }
  }

  state.answer[slotIndex] = drag.item;
}

function returnToBank(drag) {
  if (drag.origin === "answer") {
    state.answer[drag.fromSlot] = null;
    if (!state.bank.some((x) => x.id === drag.item.id)) {
      state.bank.push(drag.item);
    }
  }
}

function bindActions() {
  els.checkBtn.addEventListener("click", onCheck);
  els.resetBtn.addEventListener("click", () => loadSentence(true));
  els.nextBtn.addEventListener("click", () => {
    const article = currentArticle();
    if (state.sentenceIndex < article.sentences.length - 1) {
      state.sentenceIndex += 1;
      loadSentence(true);
    } else if (state.articleIndex < state.lessons.articles.length - 1) {
      state.articleIndex += 1;
      state.sentenceIndex = 0;
      renderArticleNav();
      loadSentence(true);
    } else {
      els.feedback.className = "feedback show ok";
      els.feedback.innerHTML = `<strong>今日短讯都拼完了</strong><div class="explain">可以换一篇，或明天再来打卡养大黄。</div>`;
    }
  });
}

function onCheck() {
  const expected = tokenize(currentSentence().en);
  const filled = state.answer.every(Boolean);
  state.attempts += 1;

  if (!filled) {
    els.feedback.className = "feedback show bad";
    els.feedback.innerHTML = "先把所有单词拖进上方空格哦。";
    return;
  }

  const got = state.answer.map((x) => x.text);
  const ok = tokensMatch(got, expected);
  if (!ok) {
    els.feedback.className = "feedback show bad";
    els.feedback.innerHTML = `还差一点点。当前：<em>${joinTokens(got)}</em>`;
    return;
  }

  const sentence = currentSentence();
  const firstTry = state.attempts === 1;
  const base = state.lessons.xp.sentenceCorrect;
  const bonus = firstTry ? state.lessons.xp.firstTryBonus : 0;
  const gained = base + bonus;
  const key = sentenceKey();
  const already = state.progress.completedSentenceIds.includes(key);

  if (!already) {
    state.progress = {
      ...state.progress,
      xp: state.progress.xp + gained,
      completedSentenceIds: [...state.progress.completedSentenceIds, key],
      lastCheckInDate: new Date().toISOString().slice(0, 10),
    };
    saveProgress(state.progress);
    showToast(`+${gained} XP${firstTry ? " · 一次过关" : ""}`);
  }

  els.feedback.className = "feedback show ok";
  els.feedback.innerHTML = `
    <strong>拼对了：${sentence.en}</strong>
    <div class="explain">
      <strong>${sentence.zh}</strong>
      <div class="note">${sentence.noteZh}</div>
    </div>
  `;
  els.nextBtn.hidden = false;
  els.checkBtn.disabled = true;
  renderProgressDots();
  updatePetHud();
}

function activePet() {
  return state.pets.pets.find((p) => p.id === state.progress.petId) || state.pets.pets[0];
}

function updatePetHud() {
  const pet = activePet();
  const stage = resolveStage(pet, state.progress.xp);
  els.petImg.src = `../${stage.image}`;
  els.petImg.alt = pet.nameZh;
  els.petName.textContent = `${pet.nameZh} · ${stage.titleZh}`;
  els.petXp.textContent = `${state.progress.xp} XP`;
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:2rem;font-family:sans-serif">加载失败：${err.message}</p>`;
});
