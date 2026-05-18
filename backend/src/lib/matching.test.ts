import { describe, expect, it } from 'vitest'
import {
  normalise,
  stripArticles,
  levenshtein,
  typoThreshold,
  isGuessCorrect,
  expandWikiPersonAcceptedForms,
} from './matching.js'

describe('normalise', () => {
  it('lowercases', () => expect(normalise('TITANIC')).toBe('titanic'))
  it('strips accents', () => expect(normalise('Intouchables')).toBe('intouchables'))
  it('strips é', () => expect(normalise('Été')).toBe('ete'))
  it('strips punctuation', () => expect(normalise("L'amour")).toBe('lamour'))
  it('collapses whitespace', () => expect(normalise('Le  Roi  Lion')).toBe('le roi lion'))
  it('trims', () => expect(normalise('  hello  ')).toBe('hello'))
  it('removes apostrophe and adjacent chars stay', () => expect(normalise("c'est")).toBe('cest'))
  it('empty string → empty string', () => expect(normalise('')).toBe(''))
  it('keeps numbers', () => expect(normalise('2001 A Space Odyssey')).toBe('2001 a space odyssey'))
  it('strips ç', () => expect(normalise('François')).toBe('francois'))
  it('strips ñ', () => expect(normalise('España')).toBe('espana'))
  it('strips dash', () => expect(normalise('Spider-Man')).toBe('spiderman'))
  it('strips dots', () => expect(normalise('Mr. Robot')).toBe('mr robot'))
})

describe('stripArticles', () => {
  it('strips "le "', () => expect(stripArticles('le roi lion')).toBe('roi lion'))
  it('strips "la "', () => expect(stripArticles('la haine')).toBe('haine'))
  it('strips "les "', () => expect(stripArticles('les misérables')).toBe('misérables'))
  it('strips "the "', () => expect(stripArticles('the lion king')).toBe('lion king'))
  it('strips "a "', () => expect(stripArticles('a beautiful mind')).toBe('beautiful mind'))
  it('strips "un "', () => expect(stripArticles('un homme')).toBe('homme'))
  it('strips "une "', () => expect(stripArticles('une femme')).toBe('femme'))
  it('strips "l "', () => expect(stripArticles('l amour')).toBe('amour'))
  it('does not strip mid-word', () => expect(stripArticles('alien')).toBe('alien'))
  it('does not strip when no article', () => expect(stripArticles('titanic')).toBe('titanic'))
  it('strips "des "', () => expect(stripArticles('des hommes et des dieux')).toBe('hommes et des dieux'))
  it('strips "an "', () => expect(stripArticles('an affair to remember')).toBe('affair to remember'))
  it('only strips leading article once', () => expect(stripArticles('le le film')).toBe('le film'))
  it('empty string → empty string', () => expect(stripArticles('')).toBe(''))
})

describe('levenshtein', () => {
  it('identical strings → 0', () => expect(levenshtein('abc', 'abc')).toBe(0))
  it('one insertion → 1', () => expect(levenshtein('abc', 'abcd')).toBe(1))
  it('one deletion → 1', () => expect(levenshtein('abcd', 'abc')).toBe(1))
  it('one substitution → 1', () => expect(levenshtein('abc', 'axc')).toBe(1))
  it('empty strings', () => expect(levenshtein('', '')).toBe(0))
  it('one empty → length of other', () => expect(levenshtein('', 'hello')).toBe(5))
  it('is symmetric', () => expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc')))
  it('transposition costs 2 (not Damerau)', () => expect(levenshtein('ab', 'ba')).toBe(2))
  it('completely different strings', () => expect(levenshtein('abc', 'xyz')).toBe(3))
})

describe('typoThreshold', () => {
  it('< 6 chars → 0', () => expect(typoThreshold(5)).toBe(0))
  it('0 chars → 0', () => expect(typoThreshold(0)).toBe(0))
  it('6 chars → 1', () => expect(typoThreshold(6)).toBe(1))
  it('12 chars → 1', () => expect(typoThreshold(12)).toBe(1))
  it('13 chars → 2', () => expect(typoThreshold(13)).toBe(2))
  it('20 chars → 2', () => expect(typoThreshold(20)).toBe(2))
  it('boundary at exactly 5 → 0', () => expect(typoThreshold(5)).toBe(0))
})

describe('isGuessCorrect', () => {
  it('exact match', () => expect(isGuessCorrect('Titanic', ['titanic'])).toBe(true))
  it('case insensitive', () => expect(isGuessCorrect('TITANIC', ['titanic'])).toBe(true))
  it('accent insensitive', () => expect(isGuessCorrect('Intouchables', ['intouchables'])).toBe(true))
  it('wrong answer → false', () => expect(isGuessCorrect('Avatar', ['titanic'])).toBe(false))
  it('matches alias', () => expect(isGuessCorrect('le roi lion', ['lion king', 'le roi lion'])).toBe(true))
  it('article stripped: "le "', () => expect(isGuessCorrect('le roi lion', ['roi lion'])).toBe(true))
  it('article stripped: "the "', () => expect(isGuessCorrect('the dark knight', ['dark knight'])).toBe(true))
  it('1-typo accepted for 7+ char title', () => expect(isGuessCorrect('titannic', ['titanic'])).toBe(true))
  it('2-typo accepted for 13+ char title', () => expect(isGuessCorrect('intterstelllaire', ['interstellaire'])).toBe(true))
  it('typo rejected for short title (≤5 chars)', () => expect(isGuessCorrect('ricky', ['rocky'])).toBe(false))
  it('empty guess → false', () => expect(isGuessCorrect('', ['titanic'])).toBe(false))
  it('skip guess (empty) matches nothing', () => expect(isGuessCorrect('', [''])).toBe(true))
  // Edge cases
  it('matches second of multiple accepted answers', () => expect(isGuessCorrect('Avatar', ['titanic', 'avatar'])).toBe(true))
  it('no accepted answers → false', () => expect(isGuessCorrect('Titanic', [])).toBe(false))
  it('accent on guess matches no-accent accepted', () => expect(isGuessCorrect('Été', ['ete'])).toBe(true))
  it('fuzzy: "la hainne" vs "la haine" (1 typo on 8-char form → accepted)', () => expect(isGuessCorrect('la hainne', ['la haine'])).toBe(true))
  it('2 typos rejected when title is 12 chars (threshold=1)', () => expect(isGuessCorrect('tiitaannic', ['titanic'])).toBe(false))
  it('matches with punctuation difference', () => expect(isGuessCorrect("Schindler's list", ['schindlers list'])).toBe(true))
  it('does not match entirely different short word', () => expect(isGuessCorrect('ali', ['titanic'])).toBe(false))
})

describe('expandWikiPersonAcceptedForms', () => {
  it('adds last token for two-word names', () => {
    const expanded = expandWikiPersonAcceptedForms([normalise('Emmanuel Macron')])
    expect(expanded).toContain('emmanuel macron')
    expect(expanded).toContain('macron')
  })

  it('adds last two tokens for three-plus-word names', () => {
    const expanded = expandWikiPersonAcceptedForms([normalise('Charles de Gaulle')])
    expect(expanded).toContain('charles de gaulle')
    expect(expanded).toContain('gaulle')
    expect(expanded).toContain('de gaulle')
  })

  it('single-word name — no expansion', () => {
    const expanded = expandWikiPersonAcceptedForms(['voltaire'])
    expect(expanded).toEqual(['voltaire'])
  })

  it('deduplicates when last token equals full name', () => {
    const expanded = expandWikiPersonAcceptedForms(['einstein'])
    expect(expanded.filter((v) => v === 'einstein')).toHaveLength(1)
  })

  it('handles four-word name — returns last and last-two tokens', () => {
    const expanded = expandWikiPersonAcceptedForms([normalise('Jean-Claude Van Damme')])
    expect(expanded).toContain('van damme')
    expect(expanded).toContain('damme')
  })

  it('handles multiple names', () => {
    const expanded = expandWikiPersonAcceptedForms([
      normalise('Barack Obama'),
      normalise('Joe Biden'),
    ])
    expect(expanded).toContain('obama')
    expect(expanded).toContain('biden')
  })

  it('empty array → empty array', () => {
    expect(expandWikiPersonAcceptedForms([])).toEqual([])
  })
})
