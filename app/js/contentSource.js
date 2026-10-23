/**
 * Future newspaper / feed adapter.
 *
 * Prototype uses curated original copy in data/lessons.json.
 * Do not scrape copyrighted newspaper pages into this app.
 *
 * A production source should:
 * 1) pull licensed RSS/API or partner content
 * 2) split article body into teachable sentences
 * 3) attach zh translation + teaching note per sentence
 * 4) return the same shape as lessons.articles[]
 */

export async function loadDemoLessons(fetcher = fetch) {
  const res = await fetcher("../data/lessons.json");
  if (!res.ok) throw new Error(`lessons load failed: ${res.status}`);
  return res.json();
}

/** Normalize a raw sentence list into scramble-ready lesson sentences. */
export function toLessonSentences(pairs) {
  return pairs.map((pair, index) => ({
    id: pair.id || `s${index + 1}`,
    en: pair.en.trim(),
    zh: pair.zh.trim(),
    noteZh: pair.noteZh || "",
  }));
}
