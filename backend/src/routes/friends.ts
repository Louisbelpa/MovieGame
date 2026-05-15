import { Router, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import db from '../db/database.js';
import { userAuth, requireUser } from '../middleware/userAuth.js';
import { AUTH, apiLimiter } from '../middleware/rateLimiter.js';

export const friendsRouter = Router();

const FRIEND_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FRIEND_CODE_LENGTH = 8;

function generateFriendCode(): string {
  const bytes = randomBytes(FRIEND_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) {
    code += FRIEND_CODE_CHARSET[bytes[i] % FRIEND_CODE_CHARSET.length];
  }
  return code;
}

function getTodayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

interface UserCodeRow {
  id: number;
  friend_code: string | null;
  display_name: string;
  stats_streak: number;
}

interface FriendshipRow {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: string;
}

interface ChallengeRow {
  id: number;
  media_type: string;
}

interface ResultRow {
  user_id: number;
  challenge_id: number;
  attempts_used: number;
  won: number;
  completed_at: string;
}

/** GET /api/friends/code */
friendsRouter.get('/code', apiLimiter, userAuth, requireUser, (req: Request, res: Response): void => {
  const userId = req.user!.id;

  const row = db
    .prepare<number, UserCodeRow>(`SELECT id, friend_code, display_name, stats_streak FROM users WHERE id = ?`)
    .get(userId)!;

  if (row.friend_code) {
    res.json({ code: row.friend_code });
    return;
  }

  let code: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateFriendCode();
    const conflict = db
      .prepare<string, { id: number }>(`SELECT id FROM users WHERE friend_code = ?`)
      .get(candidate);
    if (!conflict) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    res.status(500).json({ error: 'Could not generate unique friend code' });
    return;
  }

  db.prepare(`UPDATE users SET friend_code = ? WHERE id = ?`).run(code, userId);
  res.json({ code });
});

/** POST /api/friends/add */
friendsRouter.post('/add', AUTH, userAuth, requireUser, (req: Request, res: Response): void => {
  const { code } = req.body as { code?: unknown };

  if (typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ error: 'code is required' });
    return;
  }

  const me = req.user!.id;
  const upper = code.trim().toUpperCase();

  const target = db
    .prepare<string, UserCodeRow>(`SELECT id, friend_code, display_name, stats_streak FROM users WHERE upper(friend_code) = ?`)
    .get(upper);

  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (target.id === me) {
    res.status(400).json({ error: 'Cannot add yourself' });
    return;
  }

  const existing = db
    .prepare<[number, number, number, number], FriendshipRow>(
      `SELECT id, requester_id, addressee_id, status FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(me, target.id, target.id, me);

  if (existing) {
    res.status(409).json({ error: 'Friendship already exists or pending' });
    return;
  }

  db.prepare(
    `INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')`
  ).run(me, target.id);

  res.json({ ok: true, pending: { id: target.id, displayName: target.display_name } });
});

/** POST /api/friends/accept */
friendsRouter.post('/accept', AUTH, userAuth, requireUser, (req: Request, res: Response): void => {
  const { userId } = req.body as { userId?: unknown };

  if (typeof userId !== 'number' || !Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: 'userId must be a positive integer' });
    return;
  }

  const me = req.user!.id;

  const friendship = db
    .prepare<[number, number], FriendshipRow>(
      `SELECT id, requester_id, addressee_id, status FROM friendships
       WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`
    )
    .get(userId, me);

  if (!friendship) {
    res.status(404).json({ error: 'Pending friendship not found' });
    return;
  }

  db.prepare(`UPDATE friendships SET status = 'accepted' WHERE id = ?`).run(friendship.id);
  res.json({ ok: true });
});

/** DELETE /api/friends/:userId */
friendsRouter.delete('/:userId', AUTH, userAuth, requireUser, (req: Request, res: Response): void => {
  const targetId = parseInt(req.params.userId, 10);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Invalid userId' });
    return;
  }

  const me = req.user!.id;

  db.prepare(
    `DELETE FROM friendships
     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
  ).run(me, targetId, targetId, me);

  res.json({ ok: true });
});

/** GET /api/friends/leaderboard */
friendsRouter.get('/leaderboard', apiLimiter, userAuth, requireUser, (req: Request, res: Response): void => {
  const me = req.user!.id;

  interface FriendRow { id: number; display_name: string; avatar_url: string | null; stats_streak: number; stats_max_streak: number; }

  const accepted = db
    .prepare<[number, number, number], FriendRow>(
      `SELECT u.id, u.display_name, u.avatar_url, u.stats_streak, u.stats_max_streak
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'`
    )
    .all(me, me, me);

  const meRow = db
    .prepare<number, FriendRow>(`SELECT id, display_name, avatar_url, stats_streak, stats_max_streak FROM users WHERE id = ?`)
    .get(me)!;

  const allUsers: (FriendRow & { isMe: boolean })[] = [
    { ...meRow, isMe: true },
    ...accepted.map((f) => ({ ...f, isMe: false })),
  ];

  interface WinsRow { user_id: number; media_type: string; wins: number; played: number; }

  const userIds = allUsers.map((u) => u.id);
  const winsData = userIds.length > 0
    ? (db.prepare(
        `SELECT ucr.user_id, dc.media_type,
                COUNT(*) as played,
                SUM(CASE WHEN ucr.won = 1 THEN 1 ELSE 0 END) as wins
         FROM user_challenge_results ucr
         JOIN daily_challenges dc ON dc.id = ucr.challenge_id
         WHERE ucr.user_id IN (${userIds.map(() => '?').join(',')})
           AND dc.is_active = 1
         GROUP BY ucr.user_id, dc.media_type`
      ).all(...userIds) as WinsRow[])
    : [];

  const entries = allUsers.map((u) => {
    const rows = winsData.filter((r) => r.user_id === u.id);
    const filmWins   = rows.find((r) => r.media_type === 'film')?.wins ?? 0;
    const seriesWins = rows.find((r) => r.media_type === 'series')?.wins ?? 0;
    const wikiWins   = rows.find((r) => r.media_type === 'wiki')?.wins ?? 0;
    const totalWins  = filmWins + seriesWins + wikiWins;
    const totalPlayed = rows.reduce((s, r) => s + r.played, 0);
    return {
      id: u.id,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      isMe: u.isMe,
      totalWins,
      totalPlayed,
      winRate: totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) / 100 : 0,
      filmWins,
      seriesWins,
      wikiWins,
      currentStreak: u.stats_streak ?? 0,
      maxStreak: u.stats_max_streak ?? 0,
    };
  });

  // Sort by totalWins desc, then winRate desc
  entries.sort((a, b) => b.totalWins - a.totalWins || b.winRate - a.winRate);
  const leaderboard = entries.map((e, i) => ({ ...e, rank: i + 1 }));

  res.json({ leaderboard });
});

/** GET /api/friends */
friendsRouter.get('/', apiLimiter, userAuth, requireUser, (req: Request, res: Response): void => {
  const me = req.user!.id;
  const today = getTodayParis();

  // Optional ?date=YYYY-MM-DD — defaults to today, rejects future dates
  const rawDate = typeof req.query.date === 'string' ? req.query.date : null;
  const dateParam = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;
  const queryDate = dateParam > today ? today : dateParam;

  let myRow = db
    .prepare<number, UserCodeRow>(`SELECT id, friend_code, display_name, stats_streak FROM users WHERE id = ?`)
    .get(me)!;

  // Auto-generate friend code on first visit
  if (!myRow.friend_code) {
    let code: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateFriendCode();
      const exists = db.prepare(`SELECT 1 FROM users WHERE friend_code = ?`).get(candidate);
      if (!exists) { code = candidate; break; }
    }
    if (code) {
      db.prepare(`UPDATE users SET friend_code = ? WHERE id = ?`).run(code, me);
      myRow = { ...myRow, friend_code: code };
    }
  }

  const todayChallenges = db
    .prepare<string, ChallengeRow>(
      `SELECT id, media_type FROM daily_challenges WHERE challenge_date = ? AND is_active = 1`
    )
    .all(queryDate);

  interface FriendRow {
    id: number;
    display_name: string;
    stats_streak: number;
    friendship_id: number;
    requester_id: number;
    addressee_id: number;
    status: string;
  }

  const allFriendships = db
    .prepare<[number, number, number], FriendRow>(
      `SELECT u.id, u.display_name, u.stats_streak,
              f.id as friendship_id, f.requester_id, f.addressee_id, f.status
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE f.requester_id = ? OR f.addressee_id = ?`
    )
    .all(me, me, me);

  const accepted = allFriendships.filter((f) => f.status === 'accepted');
  const pending = allFriendships.filter((f) => f.status === 'pending');

  const allUserIds = [me, ...accepted.map((f) => f.id)];

  const allParams = [
    ...allUserIds,
    ...todayChallenges.map((c) => c.id),
  ];
  const results = allUserIds.length > 0
    ? (db
        .prepare(
          `SELECT user_id, challenge_id, attempts_used, won, completed_at
           FROM user_challenge_results
           WHERE user_id IN (${allUserIds.map(() => '?').join(',')})
             AND challenge_id IN (${todayChallenges.length > 0 ? todayChallenges.map(() => '?').join(',') : 'NULL'})`
        )
        .all(...allParams) as ResultRow[])
    : [];

  type ScoreEntry = { attemptsUsed: number; won: boolean; completedAt: string } | null;
  type Scores = { film: ScoreEntry; series: ScoreEntry; wiki: ScoreEntry };

  function buildScores(userId: number): Scores {
    const scores: Scores = { film: null, series: null, wiki: null };
    for (const challenge of todayChallenges) {
      const result = results.find(
        (r) => r.user_id === userId && r.challenge_id === challenge.id
      );
      if (result) {
        const entry: ScoreEntry = {
          attemptsUsed: result.attempts_used,
          won: result.won === 1,
          completedAt: result.completed_at,
        };
        if (challenge.media_type === 'film') scores.film = entry;
        else if (challenge.media_type === 'series') scores.series = entry;
        else if (challenge.media_type === 'wiki') scores.wiki = entry;
      }
    }
    return scores;
  }

  const friends = [
    {
      id: myRow.id,
      displayName: myRow.display_name,
      streak: myRow.stats_streak ?? 0,
      scores: buildScores(me),
      isMe: true,
    },
    ...accepted.map((f) => ({
      id: f.id,
      displayName: f.display_name,
      streak: f.stats_streak ?? 0,
      scores: buildScores(f.id),
      isMe: false,
    })),
  ];

  const pendingList = pending.map((f) => ({
    id: f.id,
    displayName: f.display_name,
    direction: (f.requester_id === me ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
  }));

  res.json({
    date: queryDate,
    today,
    myCode: myRow.friend_code,
    friends,
    pending: pendingList,
  });
});
