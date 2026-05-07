import { describe, expect, it } from 'vitest'
import { normalise, stripArticles, levenshtein, typoThreshold, isGuessCorrect } from './matching.js'

describe('normalise', () => {
  it('lowercases', () => expect(normalise('TITANIC')).toBe('titanic'))
  it('strips accents', () => expect(normalise('Intouchables')).toBe('intouchables'))
  it('strips é', () => expect(normalise('Été')).toBe('ete'))
  it('strips punctuation', () => expect(normalise("L'amour")).toBe('lamour'))
  it('collapses whitespace', () => expect(normalise('Le  Roi  Lion')).toBe('le roi lion'))
  it('trims', () => expect(normalise('  hello  ')).toBe('hello'))
  it('removes apostrophe and adjacent chars stay', () => expect(normalise("c'est")).toBe('cest'))
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
})

describe('levenshtein', () => {
  it('identical strings → 0', () => expect(levenshtein('abc', 'abc')).toBe(0))
  it('one insertion → 1', () => expect(levenshtein('abc', 'abcd')).toBe(1))
  it('one deletion → 1', () => expect(levenshtein('abcd', 'abc')).toBe(1))
  it('one substitution → 1', () => expect(levenshtein('abc', 'axc')).toBe(1))
  it('empty strings', () => expect(levenshtein('', '')).toBe(0))
  it('one empty → length of other', () => expect(levenshtein('', 'hello')).toBe(5))
})

describe('typoThreshold', () => {
  it('< 6 chars → 0', () => expect(typoThreshold(5)).toBe(0))
  it('6 chars → 1', () => expect(typoThreshold(6)).toBe(1))
  it('12 chars → 1', () => expect(typoThreshold(12)).toBe(1))
  it('13 chars → 2', () => expect(typoThreshold(13)).toBe(2))
  it('20 chars → 2', () => expect(typoThreshold(20)).toBe(2))
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
})
