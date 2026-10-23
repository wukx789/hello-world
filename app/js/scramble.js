/** Tokenize a sentence into draggable word chips (keeps punctuation attached). */
export function tokenize(sentence) {
  return String(sentence)
    .trim()
    .match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?[.,!?;:]?|[.,!?;:]/g) || [];
}

/** Fisher–Yates shuffle; retries if result accidentally matches original order. */
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

export function normalizeTokens(tokens) {
  return tokens.map((t) => String(t).trim()).filter(Boolean);
}

export function tokensMatch(a, b) {
  const left = normalizeTokens(a);
  const right = normalizeTokens(b);
  if (left.length !== right.length) return false;
  return left.every((token, i) => token === right[i]);
}

export function joinTokens(tokens) {
  return normalizeTokens(tokens)
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1");
}
