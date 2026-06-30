/**
 * routes/wiki-challenge.ts
 * All /api/wiki/* endpoints for the Wikipedia person-guessing game.
 */

import { Router, Request, Response, NextFunction } from 'express'
import { guessLimiter, searchLimiter } from '../middleware/rateLimiter.js'
import { userAuth } from '../middleware/userAuth.js'
import db from '../db/database.js'
import {
  getTodayWikiChallenge,
  getWikiChallengeByDate,
  getWikiChallengeById,
  getOrCreateWikiSession,
  buildWikiChallengePayload,
  processWikiGuess,
  getWikiResult,
  searchWikiPersons,
  getWikiGlobalStats,
} from '../services/wiki-challenge.service.js'
import { attachUserToGameSession } from '../services/game-session.service.js'
import { getTodayParis } from '../lib/dates.js'

export const wikiChallengeRouter = Router()

// ─── GET /api/wiki/today ──────────────────────────────────────────────────────

wikiChallengeRouter.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = res.locals.sessionToken as string
    const challenge = getTodayWikiChallenge()
    const session = getOrCreateWikiSession(sessionToken, challenge.id, req.user?.id)
    res.json(buildWikiChallengePayload(challenge, session))
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/wiki/date/:date ─────────────────────────────────────────────────

wikiChallengeRouter.get('/date/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.params
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' })
      return
    }
    const todayParis = getTodayParis()
    if (date > todayParis) {
      res.status(400).json({ error: 'Cannot access future challenges.' })
      return
    }
    const sessionToken = res.locals.sessionToken as string
    const challenge = getWikiChallengeByDate(date)
    const session = getOrCreateWikiSession(sessionToken, challenge.id, req.user?.id)
    res.json(buildWikiChallengePayload(challenge, session))
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/wiki/guess ─────────────────────────────────────────────────────

wikiChallengeRouter.post('/guess', guessLimiter, userAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = res.locals.sessionToken as string
    const { guess, challengeId: bodyChallId } = req.body as { guess?: string; challengeId?: number }

    if (typeof guess !== 'string') {
      res.status(422).json({ error: 'Field "guess" must be a string.' })
      return
    }
    if (guess.length > 300) {
      res.status(422).json({ error: 'Field "guess" must be 300 characters or fewer.' })
      return
    }

    const challenge = bodyChallId && typeof bodyChallId === 'number'
      ? getWikiChallengeById(bodyChallId)
      : getTodayWikiChallenge()

    const userId = req.user?.id
    const result = processWikiGuess(sessionToken, challenge.id, guess.trim(), userId)
    const session = getOrCreateWikiSession(sessionToken, challenge.id, userId)
    const payload = buildWikiChallengePayload(challenge, session)

    // Auto-record to user_challenge_results when game ends and user is logged in
    if (req.user && result.outcome) {
      db.prepare(`
        INSERT INTO user_challenge_results (user_id, challenge_id, media_type, attempts_used, won)
        VALUES (?, ?, 'wiki', ?, ?)
        ON CONFLICT(user_id, challenge_id) DO UPDATE SET
          attempts_used = excluded.attempts_used,
          won           = excluded.won,
          completed_at  = datetime('now')
      `).run(req.user.id, challenge.id, payload.attemptsUsed, result.outcome === 'won' ? 1 : 0)
      attachUserToGameSession(sessionToken, challenge.id, req.user.id)
    }

    res.json({
      correct: result.correct,
      outcome: result.outcome,
      attemptsLeft: result.attemptsLeft,
      nextHintUnlocked: result.nextHintUnlocked,
      challenge: payload,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/wiki/result ─────────────────────────────────────────────────────

wikiChallengeRouter.get('/result', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = res.locals.sessionToken as string
    let challengeId: number
    if (req.query.challengeId) {
      challengeId = parseInt(req.query.challengeId as string, 10)
      if (isNaN(challengeId)) { res.status(400).json({ error: 'Invalid challengeId.' }); return }
    } else {
      challengeId = getTodayWikiChallenge().id
    }
    res.json(getWikiResult(sessionToken, challengeId, req.user?.id))
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/wiki/dates ──────────────────────────────────────────────────────

wikiChallengeRouter.get('/dates', (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(Math.max(1, parseInt((req.query.days as string) ?? '90', 10)), 365)
    const todayParis = getTodayParis()
    const from = new Date(todayParis + 'T12:00:00Z')
    from.setUTCDate(from.getUTCDate() - days)
    const fromStr = from.toISOString().slice(0, 10)

    const rows = db
      .prepare<[string, string], { challenge_date: string }>(
        `SELECT challenge_date FROM daily_challenges
         WHERE challenge_date >= ? AND challenge_date <= ? AND media_type = 'wiki'
           AND is_active = 1
         ORDER BY challenge_date DESC`
      )
      .all(fromStr, todayParis)

    res.json({ dates: rows.map(r => r.challenge_date) })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/wiki/adjacent ───────────────────────────────────────────────────

wikiChallengeRouter.get('/adjacent', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, direction } = req.query as { date?: string; direction?: string }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be YYYY-MM-DD' }); return
    }
    if (direction !== 'prev' && direction !== 'next') {
      res.status(400).json({ error: 'direction must be "prev" or "next"' }); return
    }
    const todayParis = getTodayParis()
    const row = direction === 'prev'
      ? db.prepare<[string, string], { challenge_date: string }>(
          `SELECT challenge_date FROM daily_challenges
           WHERE challenge_date < ? AND challenge_date <= ? AND media_type = 'wiki'
             AND is_active = 1
           ORDER BY challenge_date DESC LIMIT 1`
        ).get(date, todayParis)
      : db.prepare<[string, string], { challenge_date: string }>(
          `SELECT challenge_date FROM daily_challenges
           WHERE challenge_date > ? AND challenge_date <= ? AND media_type = 'wiki'
             AND is_active = 1
           ORDER BY challenge_date ASC LIMIT 1`
        ).get(date, todayParis)

    if (!row) { res.status(404).json({ error: 'No adjacent challenge found.' }); return }
    res.json({ date: row.challenge_date })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/wiki/search ─────────────────────────────────────────────────────

wikiChallengeRouter.get('/search', searchLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) ?? ''
    const limit = Math.min(20, parseInt((req.query.limit as string) ?? '8', 10))
    res.json({ results: searchWikiPersons(q, limit) })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/wiki/stats ──────────────────────────────────────────────────────

wikiChallengeRouter.get('/stats', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(getWikiGlobalStats())
  } catch (err) {
    next(err)
  }
})
