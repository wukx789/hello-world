/**
 * Lightweight POS heuristic for vertical-slice anchors.
 * Production should swap for a real tagger (see PLAN.md Gaps §2).
 */

const DETERMINERS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "my", "your", "our", "their",
]);

const PREPOSITIONS = new Set([
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "about", "along",
  "near", "into", "over", "under", "after", "before", "between", "through",
]);

const AUX_MODALS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "am",
  "have", "has", "had", "do", "does", "did",
  "will", "would", "can", "could", "shall", "should", "may", "might", "must",
]);

const CONJUNCTIONS = new Set([
  "and", "or", "but", "so", "because", "when", "while", "if", "than", "as",
]);

const PRONOUNS = new Set([
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
]);

function stripPunct(token) {
  return String(token).replace(/^[^\w']+|[^\w']+$/g, "").toLowerCase();
}

/** @returns {'DET'|'ADP'|'AUX'|'CCONJ'|'PRON'|'NOUNISH'|'OTHER'} */
export function roughPos(token) {
  const w = stripPunct(token);
  if (!w) return "OTHER";
  if (DETERMINERS.has(w)) return "DET";
  if (PREPOSITIONS.has(w)) return "ADP";
  if (AUX_MODALS.has(w)) return "AUX";
  if (CONJUNCTIONS.has(w)) return "CCONJ";
  if (PRONOUNS.has(w)) return "PRON";
  // Capitalized mid-sentence or plural-ish → treat as content word
  if (/^[A-Z]/.test(token) || /s$|ing$|ed$/i.test(w)) return "NOUNISH";
  return "OTHER";
}

/**
 * Anchor preference: keep function words + some content anchors so the
 * skeleton stays readable. Returns boolean mask aligned with tokens.
 */
export function chooseAnchorMask(tokens, { maxAnchorsRatio = 0.45, random = Math.random } = {}) {
  const preferred = tokens.map((t) => {
    const pos = roughPos(t);
    return pos === "DET" || pos === "ADP" || pos === "AUX" || pos === "CCONJ" || pos === "PRON";
  });

  const mask = preferred.map(Boolean);
  const preferredCount = mask.filter(Boolean).length;
  const target = Math.max(1, Math.min(tokens.length - 1, Math.floor(tokens.length * maxAnchorsRatio)));

  // If too few function-word anchors, randomly pin some content words
  if (preferredCount < target) {
    const candidates = tokens
      .map((_, i) => i)
      .filter((i) => !mask[i] && roughPos(tokens[i]) !== "OTHER" || !mask[i]);
    shuffleInPlace(candidates, random);
    for (const i of candidates) {
      if (mask.filter(Boolean).length >= target) break;
      mask[i] = true;
    }
  }

  // Ensure at least one movable chip remains
  if (mask.every(Boolean) && tokens.length > 1) {
    const idx = tokens.findIndex((_, i) => roughPos(tokens[i]) === "OTHER" || roughPos(tokens[i]) === "NOUNISH");
    mask[idx === -1 ? tokens.length - 1 : idx] = false;
  }

  return mask;
}

function shuffleInPlace(arr, random) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
