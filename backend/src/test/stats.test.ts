/**
 * Integration tests for global stats.
 * Verifies that the SQLite trigger updates global_stats correctly after games.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createFilm, createChallenge, today } from './helpers.js';

const app = createApp();

async function playGame(
  guesses: string[],
  filmTitle: string
): Promise<void> {
  const agent = request.agent(app);
  const filmId = createFilm({ title: filmTitle });
  createChallenge({ filmId, date: today() });

  const todayRes = await agent.get('/api/challenge/today');
  expect(todayRes.status).toBe(200);
  const { challengeId } = todayRes.body as { challengeId: number };

  for (const guess of guesses) {
    const res = await agent.post('/api/challenge/guess').send({ challengeId, guess });
    if (res.body.challenge?.isGameOver) break;
  }
}

// ─── GET /api/stats ───────────────────────────────────────────────────────────

describe('GET /api/stats — global stats trigger', () => {
  it('increments totalWins after a won game', async () => {
    await playGame(['Test Film'], 'Test Film');

    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalWins).toBe(1);
    expect(res.body.totalGames).toBe(1);
    expect(res.body.totalLosses).toBe(0);
  });

  it('increments totalLosses after a lost game', async () => {
    await playGame(['wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5'], 'Another Film');

    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalLosses).toBe(1);
    expect(res.body.totalGames).toBe(1);
    expect(res.body.totalWins).toBe(0);
  });

  it('tracks winsByAttempt correctly — win on 2nd attempt', async () => {
    const agent = request.agent(app);
    const filmId = createFilm({ title: 'Titanic' });
    createChallenge({ filmId, date: today() });

    const todayRes = await agent.get('/api/challenge/today');
    const { challengeId } = todayRes.body as { challengeId: number };

    // First attempt: wrong
    await agent.post('/api/challenge/guess').send({ challengeId, guess: 'wrong' });
    // Second attempt: correct
    await agent.post('/api/challenge/guess').send({ challengeId, guess: 'Titanic' });

    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalWins).toBe(1);
    // Won on 2nd attempt → winsByAttempt['2'] === 1
    const winsByAttempt = res.body.winsByAttempt as Record<string, number>;
    expect(winsByAttempt['2']).toBe(1);
  });

  it('returns winRate as a percentage', async () => {
    // No games yet — winRate should be 0
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.winRate).toBe(0);
  });
});
