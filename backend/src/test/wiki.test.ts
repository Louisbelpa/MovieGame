/**
 * Integration tests for /api/wiki/* endpoints.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createWikiPerson, createWikiChallenge, today } from './helpers.js';

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
