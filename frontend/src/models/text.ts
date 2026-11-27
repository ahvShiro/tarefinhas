/** Lowercase and without accents, to compare text the way people search ("acao" finds "Ação"). */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** The words of a search, normalized. Empty when the search is blank. */
export function searchWords(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean)
}

/** True when every word appears somewhere in the text. */
export function matchesAll(text: string, words: string[]): boolean {
  const haystack = normalizeText(text)
  return words.every((word) => haystack.includes(word))
}
