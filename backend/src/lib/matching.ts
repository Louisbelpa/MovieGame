/** Normalise a guess: lowercase, strip accents, strip punctuation, collapse whitespace */
export function normalise(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip common leading articles from an already-normalised string */
export function stripArticles(s: string): string {
  return s.replace(/^(le|la|les|l|the|an|a|un|une|des)\s+/, '')
}

/** Levenshtein distance between two strings */
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/** Max allowed typos based on string length (post-normalisation) */
export function typoThreshold(len: number): number {
  if (len < 6) return 0
  if (len < 13) return 1
  return 2
}

/**
 * Returns true if rawGuess matches any accepted answer.
 * Rules (in order): exact → strip articles → fuzzy → fuzzy + strip articles
 */
export function isGuessCorrect(rawGuess: string, normalisedAccepted: string[]): boolean {
  const normGuess = normalise(rawGuess)
  const strippedGuess = stripArticles(normGuess)

  for (const acc of normalisedAccepted) {
    if (normGuess === acc) return true

    const strippedAcc = stripArticles(acc)
    if (strippedGuess === strippedAcc && strippedAcc.length > 0) return true

    const threshold = typoThreshold(acc.length)
    if (threshold > 0 && levenshtein(normGuess, acc) <= threshold) return true

    if (strippedAcc.length > 0) {
      const t2 = typoThreshold(strippedAcc.length)
      if (t2 > 0 && levenshtein(strippedGuess, strippedAcc) <= t2) return true
    }
  }
  return false
}
