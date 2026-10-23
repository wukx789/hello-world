import { chooseAnchorMask } from "./pos.js";

export function tokenize(sentence) {
  return String(sentence)
    .trim()
    .match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?[.,!?;:]?|[.,!?;:]/g) || [];
}

export function scramble(tokens, random = Math.random) {
  const source = [...tokens];
  if (source.length <= 1) return source;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = [...source];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.join(" ") !== source.join(" ")) return next;
  }
  return source.slice(1).concat(source[0]);
}

/**
 * "AI sentence select" stub: prefer mid-length declarative sentences.
 * Replace with real model call when keys/models are decided (PLAN Gaps).
 */
export function selectPracticeSentences(article, { limit = 1 } = {}) {
  const scored = article.body.map((s, index) => {
    const tokens = tokenize(s.en);
    const len = tokens.length;
    let score = 0;
    if (len >= 8 && len <= 16) score += 3;
    else if (len >= 6 && len <= 20) score += 1;
    if (/^[A-Z]/.test(s.en) && /[.!?]$/.test(s.en.trim())) score += 2;
    if (!/\?$/.test(s.en.trim())) score += 1;
    return { s, index, score };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((x) => x.s);
}

export function buildExercise(sentence, { random = Math.random } = {}) {
  const tokens = tokenize(sentence.en);
  const anchorMask = chooseAnchorMask(tokens, { random });
  const slots = tokens.map((text, index) => ({
    index,
    text,
    isAnchor: Boolean(anchorMask[index]),
  }));
  const movable = slots.filter((s) => !s.isAnchor).map((s) => s.text);
  const bank = scramble(movable, random).map((text, i) => ({
    id: `chip-${i}-${text}-${Math.floor(random() * 1e6)}`,
    text,
  }));

  return {
    id: sentence.id || undefined,
    en: sentence.en,
    zh: sentence.zh,
    noteZh: sentence.noteZh || "",
    slots,
    bank,
  };
}

export function buildPassagePayload(article, opts = {}) {
  const picked = selectPracticeSentences(article, { limit: opts.limit || 1 });
  const exercises = picked.map((s, i) =>
    buildExercise({ ...s, id: s.id || `s${i + 1}` }, opts)
  );
  return {
    passageId: article.id,
    source: article.source,
    section: article.section,
    headline: article.headline,
    headlineZh: article.headlineZh,
    dek: article.dek,
    fetchedAt: opts.fetchedAt || null,
    exercises,
  };
}

export function tokensMatch(a, b) {
  if (a.length !== b.length) return false;
  return a.every((t, i) => String(t).trim() === String(b[i]).trim());
}
