/**
 * Test helpers: data factories and utilities for integration tests.
 */

import type { Application } from 'express';
import request from 'supertest';
import db from '../db/database.js';

// ─── Date helper ─────────────────────────────────────────────────────────────

export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

export function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d);
}

// ─── Factories ────────────────────────────────────────────────────────────────

interface FilmOverrides {
  title?: string;
  year?: number;
  director?: string;
  image_url?: string;
  genres?: string;
  cast_members?: string;
  title_aliases?: string;
  is_active?: number;
  tagline?: string;
  synopsis?: string;
}

export function createFilm(overrides: FilmOverrides = {}): number {
  const defaults: Required<FilmOverrides> = {
    title: 'Test Film',
    year: 2020,
    director: 'Test Director',
    image_url: '/test.jpg',
    genres: '[]',
    cast_members: '[]',
    title_aliases: '[]',
    is_active: 1,
    tagline: null as unknown as string,
    synopsis: null as unknown as string,
  };
  const f = { ...defaults, ...overrides };
  const result = db.prepare(`
    INSERT INTO films (title, year, director, image_url, genres, cast_members, title_aliases, is_active, tagline, synopsis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(f.title, f.year, f.director, f.image_url, f.genres, f.cast_members, f.title_aliases, f.is_active, f.tagline ?? null, f.synopsis ?? null);
  return result.lastInsertRowid as number;
}

interface SeriesOverrides {
  title?: string;
  year?: number;
  creator?: string;
  image_url?: string;
  genres?: string;
  cast_members?: string;
  title_aliases?: string;
  is_active?: number;
  tagline?: string;
  synopsis?: string;
}

export function createSeries(overrides: SeriesOverrides = {}): number {
  const defaults: Required<SeriesOverrides> = {
    title: 'Test Series',
    year: 2020,
    creator: 'Test Creator',
    image_url: '/test.jpg',
    genres: '[]',
    cast_members: '[]',
    title_aliases: '[]',
    is_active: 1,
    tagline: null as unknown as string,
    synopsis: null as unknown as string,
  };
  const s = { ...defaults, ...overrides };
  const result = db.prepare(`
    INSERT INTO series (title, year, creator, image_url, genres, cast_members, title_aliases, is_active, tagline, synopsis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(s.title, s.year, s.creator, s.image_url, s.genres, s.cast_members, s.title_aliases, s.is_active, s.tagline ?? null, s.synopsis ?? null);
  return result.lastInsertRowid as number;
}

interface ChallengeParams {
  filmId?: number;
  seriesId?: number;
  date?: string;
  number?: number;
  hintSchedule?: string;
}

export function createChallenge(params: ChallengeParams = {}): number {
  const date = params.date ?? today();
  const challengeNumber = params.number ?? 1;
  const hintSchedule = params.hintSchedule ?? '["year","director","cast"]';

  if (params.seriesId !== undefined) {
    const result = db.prepare(`
      INSERT INTO daily_challenges (challenge_date, media_type, series_id, challenge_number, hint_schedule)
      VALUES (?, 'series', ?, ?, ?)
    `).run(date, params.seriesId, challengeNumber, hintSchedule);
    return result.lastInsertRowid as number;
  }

  const filmId = params.filmId!;
  const result = db.prepare(`
    INSERT INTO daily_challenges (challenge_date, media_type, film_id, challenge_number, hint_schedule)
    VALUES (?, 'film', ?, ?, ?)
  `).run(date, filmId, challengeNumber, hintSchedule);
  return result.lastInsertRowid as number;
}

interface WikiPersonOverrides {
  name?: string;
  slug_fr?: string;
  slug_en?: string;
  person_type?: string;
  infobox_data?: string;
  hint_schedule?: string;
  photo_url?: string;
  extract?: string;
  wikipedia_url?: string;
  is_active?: number;
  difficulty?: number;
  name_aliases?: string;
}

export function createWikiPerson(overrides: WikiPersonOverrides = {}): number {
  const defaults: Required<WikiPersonOverrides> = {
    name: 'Test Person',
    slug_fr: 'test-person',
    slug_en: 'test-person',
    person_type: 'politician',
    infobox_data: '{}',
    hint_schedule: '["birth_year","nationality"]',
    photo_url: '',
    extract: '',
    wikipedia_url: '',
    is_active: 1,
    difficulty: 3,
    name_aliases: '[]',
  };
  const p = { ...defaults, ...overrides };
  // wikipedia_slug must be unique — use slug_fr as the stored slug
  const slug = p.slug_fr;
  const result = db.prepare(`
    INSERT INTO wiki_persons (name, name_aliases, person_type, wikipedia_slug, infobox_data, hint_schedule, photo_url, extract, wikipedia_url, is_active, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.name, p.name_aliases, p.person_type, slug, p.infobox_data, p.hint_schedule, p.photo_url || null, p.extract || null, p.wikipedia_url || null, p.is_active, p.difficulty);
  return result.lastInsertRowid as number;
}

interface WikiChallengeParams {
  wikiPersonId: number;
  date?: string;
  number?: number;
  hintSchedule?: string;
}

export function createWikiChallenge(params: WikiChallengeParams): number {
  const date = params.date ?? today();
  const challengeNumber = params.number ?? 1;
  const hintSchedule = params.hintSchedule ?? '["birth_year","nationality"]';
  const result = db.prepare(`
    INSERT INTO daily_challenges (challenge_date, media_type, wiki_person_id, challenge_number, hint_schedule)
    VALUES (?, 'wiki', ?, ?, ?)
  `).run(date, params.wikiPersonId, challengeNumber, hintSchedule);
  return result.lastInsertRowid as number;
}

// ─── Admin auth helper ────────────────────────────────────────────────────────

export async function adminLogin(agent: ReturnType<typeof request.agent>): Promise<void> {
  await agent
    .post('/api/admin/login')
    .send({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })
    .expect(200);
}

// Re-export supertest for convenience
export { request };

// Helper to create a supertest agent bound to an Express app
export function makeAgent(app: Application): ReturnType<typeof request.agent> {
  return request.agent(app);
}
