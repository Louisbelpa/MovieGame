/**
 * Integration tests for /api/wiki/* endpoints.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createWikiPerson, createWikiChallenge, today, yesterday } from './helpers.js';

const app = createApp();

// ─── GET /api/wiki/today ──────────────────────────────────────────────────────

describe('GET /api/wiki/today', () => {
  it('returns 404 when no wiki challenge is scheduled', async () => {
    const res = await request(app).get('/api/wiki/today');
    expect(res.status).toBe(404);
  });

  it('returns 200 with challenge payload when scheduled', async () => {
    const personId = createWikiPerson({ name: 'Jacques Chirac' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const res = await request(app).get('/api/wiki/today');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      challengeId: expect.any(Number),
      isGameOver: false,
      outcome: null,
      attempts: [],
      mediaType: 'wiki',
    });
  });
});

// ─── POST /api/wiki/guess ─────────────────────────────────────────────────────

describe('POST /api/wiki/guess', () => {
  it('returns correct:true and outcome:won on exact name match', async () => {
    const agent = request.agent(app);
    const personId = createWikiPerson({ name: 'Jacques Chirac' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await agent.get('/api/wiki/today');
    expect(todayRes.status).toBe(200);
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/wiki/guess')
      .send({ challengeId, guess: 'Jacques Chirac' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(true);
    expect(guessRes.body.outcome).toBe('won');
    expect(guessRes.body.challenge.isGameOver).toBe(true);
  });

  it('accepts surname-only guess for multi-word name', async () => {
    const agent = request.agent(app);
    const personId = createWikiPerson({ name: 'Jacques Chirac' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await agent.get('/api/wiki/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/wiki/guess')
      .send({ challengeId, guess: 'Chirac' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(true);
    expect(guessRes.body.outcome).toBe('won');
  });

  it('returns correct:false and isGameOver:false on wrong guess', async () => {
    const agent = request.agent(app);
    const personId = createWikiPerson({ name: 'Jacques Chirac' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await agent.get('/api/wiki/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/wiki/guess')
      .send({ challengeId, guess: 'Nicolas Sarkozy' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(false);
    expect(guessRes.body.outcome).toBeNull();
    expect(guessRes.body.challenge.isGameOver).toBe(false);
    expect(guessRes.body.challenge.attempts).toHaveLength(1);
  });

  it('returns 422 when guess field is missing', async () => {
    const personId = createWikiPerson();
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await request(app).get('/api/wiki/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const res = await request(app)
      .post('/api/wiki/guess')
      .send({ challengeId }); // no guess
    expect(res.status).toBe(422);
  });
});

// ─── Wiki attempt limit ───────────────────────────────────────────────────────

describe('Wiki game — lost after WIKI_MAX_ATTEMPTS wrong answers', () => {
  it('sets outcome to lost after 3 wrong attempts', async () => {
    const agent = request.agent(app);
    const personId = createWikiPerson({ name: 'Jacques Chirac' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await agent.get('/api/wiki/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    let lastRes: Awaited<ReturnType<typeof agent.post>> | null = null;
    for (let i = 0; i < 3; i++) {
      lastRes = await agent
        .post('/api/wiki/guess')
        .send({ challengeId, guess: `wrong${i}` });
    }
    expect(lastRes!.status).toBe(200);
    expect(lastRes!.body.outcome).toBe('lost');
    expect(lastRes!.body.challenge.isGameOver).toBe(true);

    // Extra attempt → 409
    const extra = await agent
      .post('/api/wiki/guess')
      .send({ challengeId, guess: 'Jacques Chirac' });
    expect(extra.status).toBe(409);
  });
});

// ─── Wiki skip ────────────────────────────────────────────────────────────────

describe('POST /api/wiki/guess — skip (empty string)', () => {
  it('accepts empty guess as a skip and does not count as correct', async () => {
    const agent = request.agent(app);
    const personId = createWikiPerson({ name: 'Marie Curie' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await agent.get('/api/wiki/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const res = await agent.post('/api/wiki/guess').send({ challengeId, guess: '' });
    expect(res.status).toBe(200);
    expect(res.body.correct).toBe(false);
    expect(res.body.challenge.isGameOver).toBe(false);
    const last = res.body.challenge.attempts.at(-1) as { guess: string; correct: boolean };
    expect(last.guess).toBe('');
  });
});

// ─── Wiki archive ─────────────────────────────────────────────────────────────

describe('GET /api/wiki/date/:date', () => {
  it('returns 200 with isPastChallenge:true for a past date', async () => {
    const personId = createWikiPerson({ name: 'Past Person', slug_fr: 'past-person' });
    createWikiChallenge({ wikiPersonId: personId, date: yesterday() });

    const res = await request(app).get(`/api/wiki/date/${yesterday()}`);
    expect(res.status).toBe(200);
    expect(res.body.isPastChallenge).toBe(true);
  });

  it('returns 400 for a future date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(futureDate);

    const res = await request(app).get(`/api/wiki/date/${futureDateStr}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 for a past date with no challenge', async () => {
    const res = await request(app).get('/api/wiki/date/2000-01-01');
    expect(res.status).toBe(404);
  });
});

// ─── Wiki search autocomplete ─────────────────────────────────────────────────

describe('GET /api/wiki/search', () => {
  it('returns matching persons in results array', async () => {
    createWikiPerson({ name: 'AutocompleteWikiPerson', slug_fr: 'autocomplete-wiki-person' });

    const res = await request(app).get('/api/wiki/search?q=AutocompleteWiki');
    expect(res.status).toBe(200);
    const results = (res.body.results ?? res.body) as { title: string }[];
    expect(Array.isArray(results)).toBe(true);
    // search returns { title, personType } — title maps to the person's name
    expect(results.some((p) => p.title === 'AutocompleteWikiPerson')).toBe(true);
  });

  it('returns empty results when no match', async () => {
    const res = await request(app).get('/api/wiki/search?q=ZZZNOMATCH999WIKI');
    expect(res.status).toBe(200);
    const results = (res.body.results ?? res.body) as unknown[];
    expect(results).toHaveLength(0);
  });
});

// ─── Wiki result endpoint ─────────────────────────────────────────────────────

describe('GET /api/wiki/result', () => {
  it('returns 400 for invalid (non-numeric) challengeId', async () => {
    const res = await request(app).get('/api/wiki/result?challengeId=notanumber');
    expect(res.status).toBe(400);
  });

  it('returns result with revealed person after game over', async () => {
    const agent = request.agent(app);
    const personId = createWikiPerson({ name: 'Revealed Person', slug_fr: 'revealed-person' });
    createWikiChallenge({ wikiPersonId: personId, date: today() });

    const todayRes = await agent.get('/api/wiki/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    // win the game
    await agent.post('/api/wiki/guess').send({ challengeId, guess: 'Revealed Person' });

    const res = await agent.get(`/api/wiki/result?challengeId=${challengeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
  });
});
