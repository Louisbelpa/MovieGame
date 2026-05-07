import { describe, it, expect } from 'vitest'
import { normalise, stripArticles, levenshtein, typoThreshold, isGuessCorrect } from './matching.js'

describe('normalise', () => {
  it('lowercases', () => expect(normalise('Titanic')).toBe('titanic'))
  it('strips accents', () => expect(normalise('Éléphant')).toBe('elephant'))
  it('strips punctuation', () => expect(normalise("L'Amour, c'est tout!")).toBe('lamour cest tout'))
  it('collapses whitespace', () => expect(normalise('  foo   bar  ')).toBe('foo bar'))
  it('handles mixed accents and case', () => expect(normalise('Intouchables')).toBe('intouchables'))
})

describe('stripArticles', () => {
  it('strips "Le"', () => expect(stripArticles('le parrain')).toBe('parrain'))
  it('strips "La"', () => expect(stripArticles('la vie est belle')).toBe('vie est belle'))
  it('strips "Les"', () => expect(stripArticles('les misérables')).toBe('misérables'))
  it('strips "The"', () => expect(stripArticles('the godfather')).toBe('godfather'))
  // stripArticles receives already-normalised strings (apostrophe already stripped by normalise)
  // "l'enfant" normalised → "lenfant" (no space after l, no strip)
  it('l apostrophe: no strip without space', () => expect(stripArticles("lenfant")).toBe('lenfant'))
  it('does not strip mid-word', () => expect(stripArticles('legend')).toBe('legend'))
  it('returns empty string unchanged', () => expect(stripArticles('')).toBe(''))
})

describe('levenshtein', () => {
  it('identical strings = 0', () => expect(levenshtein('abc', 'abc')).toBe(0))
  it('1 substitution', () => expect(levenshtein('abc', 'axc')).toBe(1))
  it('1 insertion', () => expect(levenshtein('abc', 'abcd')).toBe(1))
  it('1 deletion', () => expect(levenshtein('abcd', 'abc')).toBe(1))
  it('empty strings', () => expect(levenshtein('', '')).toBe(0))
  it('one empty', () => expect(levenshtein('abc', '')).toBe(3))
})

describe('typoThreshold', () => {
  it('< 6 chars → 0', () => expect(typoThreshold(5)).toBe(0))
  it('6 chars → 1', () => expect(typoThreshold(6)).toBe(1))
  it('12 chars → 1', () => expect(typoThreshold(12)).toBe(1))
  it('13 chars → 2', () => expect(typoThreshold(13)).toBe(2))
  it('20 chars → 2', () => expect(typoThreshold(20)).toBe(2))
})

describe('isGuessCorrect', () => {
  const accepted = ['titanic', 'le parrain', 'intouchables'].map(s => s)

  it('exact match', () => expect(isGuessCorrect('titanic', ['titanic'])).toBe(true))
  it('case insensitive', () => expect(isGuessCorrect('TITANIC', ['titanic'])).toBe(true))
  it('accent stripped', () => expect(isGuessCorrect('Éléphant', ['elephant'])).toBe(true))
  it('article stripped — Le Parrain → parrain', () => {
    expect(isGuessCorrect('Le Parrain', ['le parrain'])).toBe(true)
  })
  it('article stripped in accepted — guess without article', () => {
    expect(isGuessCorrect('Parrain', ['le parrain'])).toBe(true)
  })
  it('1-char typo accepted for long title', () => {
    expect(isGuessCorrect('intouchabls', ['intouchables'])).toBe(true)
  })
  it('2-char typo rejected (word < 6 chars → threshold 0)', () => {
    // "rocky" = 5 chars → threshold 0, so any typo is rejected
    expect(isGuessCorrect('ricky', ['rocky'])).toBe(false)
  })
  it('1-char typo accepted for 7-char title (threshold 1)', () => {
    // "titanic" = 7 chars → threshold 1, "titanicc" = distance 1 → accepted
    expect(isGuessCorrect('titanicc', ['titanic'])).toBe(true)
  })
  it('completely different title rejected', () => {
    expect(isGuessCorrect('avatar', ['titanic'])).toBe(false)
  })
  it('empty guess rejected', () => {
    expect(isGuessCorrect('', ['titanic'])).toBe(false)
  })
  it('matches any accepted alias', () => {
    expect(isGuessCorrect('godfather', ['the godfather', 'parrain'])).toBe(true)
  })
  void accepted // used to avoid TS unused warning
})
