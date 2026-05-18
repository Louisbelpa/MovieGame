/**
 * Integration tests for /api/challenge/* endpoints.
 * Uses a real in-memory SQLite DB (no mocks).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { createApp } from '../app.js';
import db from '../db/database.js';
import { createFilm, createSeries, createChallenge, today, yesterday } from './helpers.js';

function createTestUserSession(): string {
  const userId = db
    .prepare(`INSERT INTO users (email, display_name) VALUES (?, ?)`)
    .run(`user-${randomBytes(4).toString('hex')}@test.local`, 'Test User').lastInsertRowid as number;
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).run(
    sessionId,
    userId,
    expiresAt
  );
  return sessionId;
}

const app = createApp();

// ─── GET /api/challenge/today ─────────────────────────────────────────────────

describe('GET /api/challenge/today', () => {
  it('returns 404 when no challenge is scheduled', async () => {
    const res = await request(app).get('/api/challenge/today');
    expect(res.status).toBe(404);
  });

  it('returns 200 with challenge payload when scheduled', async () => {
    const filmId = createFilm({ title: 'Inception' });
    createChallenge({ filmId, date: today() });

    const res = await request(app).get('/api/challenge/today');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      challengeId: expect.any(Number),
      imageUrl: expect.any(String),
      hints: expect.any(Array),
      attempts: [],
      isGameOver: false,
      outcome: null,
      mediaType: 'film',
    });
  });
});

// ─── POST /api/challenge/guess — correct ─────────────────────────────────────

describe('POST /api/challenge/guess — correct answer', () => {
  it('returns correct:true and outcome:won on exact match', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({ title: 'Inception' });
    createChallenge({ filmId, date: today() });

    // First get today to seed session
    const todayRes = await agent.get('/api/challenge/today');
    expect(todayRes.status).toBe(200);
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: 'Inception' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body).toMatchObject({
      correct: true,
      outcome: 'won',
    });
    // challenge payload should show game over
    expect(guessRes.body.challenge.isGameOver).toBe(true);
    expect(guessRes.body.challenge.outcome).toBe('won');
  });
});

// ─── POST /api/challenge/guess — wrong answer ─────────────────────────────────

describe('POST /api/challenge/guess — wrong answer', () => {
  it('returns correct:false and isGameOver:false', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({ title: 'Inception' });
    createChallenge({ filmId, date: today() });

    const todayRes = await agent.get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: 'Wrong Answer' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(false);
    expect(guessRes.body.outcome).toBeNull();
    expect(guessRes.body.challenge.isGameOver).toBe(false);
    expect(guessRes.body.challenge.attempts).toHaveLength(1);
  });
});

// ─── POST /api/challenge/guess — skip (empty string) ─────────────────────────

describe('POST /api/challenge/guess — skip', () => {
  it('accepts empty string as a skip attempt', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({ title: 'Inception' });
    createChallenge({ filmId, date: today() });

    const todayRes = await agent.get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: '' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(false);
    expect(guessRes.body.challenge.isGameOver).toBe(false);
    // The stored guess should be empty string (skipped)
    const lastAttempt = guessRes.body.challenge.attempts.at(-1) as { guess: string; correct: boolean };
    expect(lastAttempt.guess).toBe('');
    expect(lastAttempt.correct).toBe(false);
  });
});

// ─── Attempt limit → lost ─────────────────────────────────────────────────────

describe('Attempt limit — game lost after MAX_ATTEMPTS wrong answers', () => {
  it('sets outcome to lost after 5 wrong attempts', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({ title: 'Inception' });
    createChallenge({ filmId, date: today() });

    const todayRes = await agent.get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    let lastRes: Awaited<ReturnType<typeof agent.post>> | null = null;
    for (let i = 0; i < 5; i++) {
      lastRes = await agent
        .post('/api/challenge/guess')
        .send({ challengeId, guess: `wrong${i}` });
    }

    expect(lastRes!.status).toBe(200);
    expect(lastRes!.body.outcome).toBe('lost');
    expect(lastRes!.body.challenge.isGameOver).toBe(true);

    // 6th attempt should return 409
    const extraRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: 'one more' });
    expect(extraRes.status).toBe(409);
  });
});

// ─── Archive: past challenge by date ─────────────────────────────────────────

describe('GET /api/challenge/date/:date — archive', () => {
  it('returns 200 with isPastChallenge:true for a past date', async () => {
    const yesterdayDate = yesterday();
    const filmId = createFilm({ title: 'Old Film' });
    createChallenge({ filmId, date: yesterdayDate });

    const res = await request(app).get(`/api/challenge/date/${yesterdayDate}`);
    expect(res.status).toBe(200);
    expect(res.body.isPastChallenge).toBe(true);
    expect(res.body.date).toBe(yesterdayDate);
  });

  it('returns 400 for a future date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(tomorrow);

    const res = await request(app).get(`/api/challenge/date/${futureDate}`);
    expect(res.status).toBe(400);
  });
});

// ─── Series mode ──────────────────────────────────────────────────────────────

describe('Series mode', () => {
  it('returns 200 for GET /api/challenge/today?type=series', async () => {
    const seriesId = createSeries({ title: 'Breaking Bad' });
    createChallenge({ seriesId, date: today() });

    const res = await request(app).get('/api/challenge/today?type=series');
    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('series');
  });

  it('correctly resolves a winning guess for a series', async () => {
    const agent = request.agent(app);
    const seriesId = createSeries({ title: 'Breaking Bad' });
    createChallenge({ seriesId, date: today() });

    const todayRes = await agent.get('/api/challenge/today?type=series');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: 'Breaking Bad' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(true);
    expect(guessRes.body.outcome).toBe('won');
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('Cross-device sync — logged-in user', () => {
  it('returns completed today challenge on a second client with the same account', async () => {
    const bearer = createTestUserSession();
    const auth = { Authorization: `Bearer ${bearer}` };

    const mobile = request.agent(app);
    const filmId = createFilm({ title: 'Inception' });
    createChallenge({ filmId, date: today() });

    const todayRes = await mobile.get('/api/challenge/today').set(auth);
    const { challengeId } = todayRes.body as { challengeId: number };

    const winRes = await mobile
      .post('/api/challenge/guess')
      .set(auth)
      .send({ challengeId, guess: 'Inception' });
    expect(winRes.body.outcome).toBe('won');

    const web = request.agent(app);
    const webToday = await web.get('/api/challenge/today').set(auth);
    expect(webToday.status).toBe(200);
    expect(webToday.body.isGameOver).toBe(true);
    expect(webToday.body.outcome).toBe('won');
  });
});

describe('POST /api/challenge/guess — validation', () => {
  it('returns 422 when guess field is missing', async () => {
    const filmId = createFilm();
    createChallenge({ filmId, date: today() });

    const todayRes = await request(app).get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const res = await request(app)
      .post('/api/challenge/guess')
      .send({ challengeId }); // no guess field
    expect(res.status).toBe(422);
  });

  it('returns 400, 404, or 422 when challengeId is missing', async () => {
    const res = await request(app)
      .post('/api/challenge/guess')
      .send({ guess: 'Inception' });
    expect([400, 404, 422]).toContain(res.status);
  });

  it('returns 404 for non-existent challengeId', async () => {
    const agent = request.agent(app);
    // seed a session first so the agent has a token
    const filmId = createFilm();
    createChallenge({ filmId, date: today() });
    await agent.get('/api/challenge/today');

    const res = await agent
      .post('/api/challenge/guess')
      .send({ challengeId: 999999, guess: 'Inception' });
    expect(res.status).toBe(404);
  });
});

// ─── Alias matching ───────────────────────────────────────────────────────────

describe('POST /api/challenge/guess — alias matching', () => {
  it('accepts alias title as correct answer', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({
      title: 'Le Roi Lion',
      title_aliases: '["Lion King","roi lion"]',
    });
    createChallenge({ filmId, date: today() });

    const todayRes = await agent.get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: 'Lion King' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(true);
    expect(guessRes.body.outcome).toBe('won');
  });

  it('accepts accent-insensitive guess', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({ title: 'Intouchables' });
    createChallenge({ filmId, date: today() });

    const todayRes = await agent.get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    const guessRes = await agent
      .post('/api/challenge/guess')
      .send({ challengeId, guess: 'intouchables' });
    expect(guessRes.status).toBe(200);
    expect(guessRes.body.correct).toBe(true);
  });
});

// ─── Archive: dates list ──────────────────────────────────────────────────────

describe('GET /api/challenge/dates', () => {
  it('returns { dates: [...] } with active challenge dates', async () => {
    const filmId = createFilm({ title: 'Archive Film' });
    createChallenge({ filmId, date: yesterday() });

    const res = await request(app).get('/api/challenge/dates?days=7');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.dates)).toBe(true);
    expect(res.body.dates).toContain(yesterday());
  });
});

// ─── Search / autocomplete ────────────────────────────────────────────────────

describe('GET /api/films/search', () => {
  it('returns matching films', async () => {
    createFilm({ title: 'AutocompleteUniqueFilm' });

    const res = await request(app).get('/api/films/search?q=AutocompleteUnique');
    expect(res.status).toBe(200);
    const results = (res.body.results ?? res.body) as { title: string }[];
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((f) => f.title === 'AutocompleteUniqueFilm')).toBe(true);
  });

  it('returns empty results when no match', async () => {
    const res = await request(app).get('/api/films/search?q=ZZZNOMATCH999');
    expect(res.status).toBe(200);
    const results = (res.body.results ?? res.body) as unknown[];
    expect(results).toHaveLength(0);
  });
});
