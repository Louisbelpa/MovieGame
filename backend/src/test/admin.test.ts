/**
 * Integration tests for /api/admin/* endpoints.
 * Uses a real in-memory SQLite DB (no mocks).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import {
  createFilm,
  createSeries,
  createChallenge,
  createWikiPerson,
  today,
  adminLogin,
  makeAgent,
  request,
} from './helpers.js';

const app = createApp();

// Shared authenticated agent — re-login before each test because afterEach
// wipes active_admin_tokens. Rate limit is set to 1000 in test env.
let agent: ReturnType<typeof makeAgent>;

beforeEach(async () => {
  agent = makeAgent(app);
  await adminLogin(agent);
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/login', () => {
  it('returns 200 with valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/admin/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/logout', () => {
  it('returns 200 after logout', async () => {
    // Use a fresh agent so we don't break the shared one
    const freshAgent = makeAgent(app);
    await adminLogin(freshAgent);
    const res = await freshAgent.post('/api/admin/logout');
    expect(res.status).toBe(200);
  });

  it('returns 401 for protected route after logout', async () => {
    const freshAgent = makeAgent(app);
    await adminLogin(freshAgent);
    await freshAgent.post('/api/admin/logout');
    const res = await freshAgent.get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('Protected routes — unauthenticated', () => {
  it('GET /api/admin/dashboard returns 401', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/films returns 401', async () => {
    const res = await request(app).get('/api/admin/films');
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/films returns 401', async () => {
    const res = await request(app).post('/api/admin/films').send({});
    expect(res.status).toBe(401);
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('GET /api/admin/dashboard', () => {
  it('returns dashboard structure when empty', async () => {
    const res = await agent.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('today_film_challenge');
    expect(res.body).toHaveProperty('upcoming_film_challenges');
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('total_films');
    expect(res.body.stats).toHaveProperty('total_series');
  });

  it('shows today film challenge', async () => {
    const filmId = createFilm({ title: 'Dashboard Film' });
    createChallenge({ filmId, date: today() });

    const res = await agent.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.today_film_challenge).not.toBeNull();
    expect(res.body.today_film_challenge.film.title).toBe('Dashboard Film');
  });
});

// ─── Films CRUD ───────────────────────────────────────────────────────────────

describe('GET /api/admin/films', () => {
  it('returns empty list with pagination shape when no films', async () => {
    const res = await agent.get('/api/admin/films');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 0 });
  });

  it('returns created films in data array', async () => {
    createFilm({ title: 'Inception' });
    createFilm({ title: 'Interstellar' });

    const res = await agent.get('/api/admin/films');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('supports q search filter', async () => {
    createFilm({ title: 'UniqueTitleXYZ' });

    const res = await agent.get('/api/admin/films?q=UniqueTitleXYZ');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toBe('UniqueTitleXYZ');
  });
});

describe('POST /api/admin/films', () => {
  it('creates a film with valid payload', async () => {
    const res = await agent.post('/api/admin/films').send({
      title: 'New Film',
      year: 2020,
      director: 'John Doe',
      image_url: '/images/new-film.jpg',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New Film',
      year: 2020,
      director: 'John Doe',
    });
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const res = await agent.post('/api/admin/films').send({
      year: 2020,
      director: 'John Doe',
      image_url: '/images/test.jpg',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when year is missing', async () => {
    const res = await agent.post('/api/admin/films').send({
      title: 'No Year Film',
      director: 'John Doe',
      image_url: '/images/test.jpg',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/year/i);
  });

  it('returns 400 when year is out of range', async () => {
    const res = await agent.post('/api/admin/films').send({
      title: 'Old Film',
      year: 1800,
      director: 'John Doe',
      image_url: '/images/test.jpg',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when image_url is missing', async () => {
    const res = await agent.post('/api/admin/films').send({
      title: 'No Image Film',
      year: 2020,
      director: 'John Doe',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/image_url/i);
  });

  it('returns 400 when genres is not an array', async () => {
    const res = await agent.post('/api/admin/films').send({
      title: 'Bad Genres',
      year: 2020,
      director: 'John Doe',
      image_url: '/images/test.jpg',
      genres: 'Action',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/genres/i);
  });
});

describe('PUT /api/admin/films/:id', () => {
  it('updates film fields', async () => {
    const filmId = createFilm({ title: 'Old Title' });

    const res = await agent.put(`/api/admin/films/${filmId}`).send({
      title: 'Updated Title',
      year: 2021,
      director: 'New Director',
      image_url: '/images/updated.jpg',
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.director).toBe('New Director');
  });

  it('returns 404 for non-existent film', async () => {
    const res = await agent.put('/api/admin/films/99999').send({
      title: 'Ghost',
      year: 2020,
      director: 'Ghost',
      image_url: '/ghost.jpg',
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await agent.put('/api/admin/films/abc').send({
      title: 'Film',
      year: 2020,
      director: 'Dir',
      image_url: '/img.jpg',
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/films/:id', () => {
  it('soft-deletes a film and returns ok', async () => {
    const filmId = createFilm({ title: 'To Delete' });

    const res = await agent.delete(`/api/admin/films/${filmId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('id', filmId);
  });

  it('returns 404 for non-existent film', async () => {
    const res = await agent.delete('/api/admin/films/99999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/films/:id', () => {
  it('toggles is_active', async () => {
    const filmId = createFilm({ title: 'Toggle Film', is_active: 1 });

    const res = await agent.patch(`/api/admin/films/${filmId}`).send({ is_active: false });
    expect(res.status).toBe(200);
  });

  it('returns 404 for missing film', async () => {
    const res = await agent.patch('/api/admin/films/99999').send({ is_active: false });
    expect(res.status).toBe(404);
  });
});

// ─── Series CRUD ──────────────────────────────────────────────────────────────

describe('GET /api/admin/series', () => {
  it('returns series list with pagination shape', async () => {
    createSeries({ title: 'Breaking Bad' });

    const res = await agent.get('/api/admin/series');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toBe('Breaking Bad');
  });
});

describe('POST /api/admin/series', () => {
  it('creates a series with valid payload', async () => {
    const res = await agent.post('/api/admin/series').send({
      title: 'New Series',
      year: 2022,
      creator: 'Jane Smith',
      image_url: '/images/new-series.jpg',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New Series',
      year: 2022,
      creator: 'Jane Smith',
    });
  });

  it('returns 400 when title is missing', async () => {
    const res = await agent.post('/api/admin/series').send({
      year: 2022,
      creator: 'Jane Smith',
      image_url: '/images/test.jpg',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when genres is not an array', async () => {
    const res = await agent.post('/api/admin/series').send({
      title: 'Series',
      year: 2022,
      creator: 'Creator',
      image_url: '/images/test.jpg',
      genres: 'Drama',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/genres/i);
  });
});

describe('PATCH /api/admin/series/:id', () => {
  it('updates partial fields on a series', async () => {
    const seriesId = createSeries({ title: 'Old Series' });

    const res = await agent.patch(`/api/admin/series/${seriesId}`).send({ is_active: false });
    expect(res.status).toBe(200);
  });

  it('returns 404 for missing series', async () => {
    const res = await agent.patch('/api/admin/series/99999').send({ is_active: false });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/series/:id', () => {
  it('soft-deletes a series', async () => {
    const seriesId = createSeries({ title: 'To Delete Series' });

    const res = await agent.delete(`/api/admin/series/${seriesId}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent series', async () => {
    const res = await agent.delete('/api/admin/series/99999');
    expect(res.status).toBe(404);
  });
});

// ─── Challenges ───────────────────────────────────────────────────────────────

describe('GET /api/admin/challenges', () => {
  it('returns challenge list in data array', async () => {
    const filmId = createFilm();
    createChallenge({ filmId, date: today() });

    const res = await agent.get('/api/admin/challenges');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/admin/challenges', () => {
  it('schedules a film challenge', async () => {
    const filmId = createFilm({ title: 'Challenge Film' });

    const res = await agent.post('/api/admin/challenges').send({
      date: '2030-06-15',
      film_id: filmId,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ date: '2030-06-15' });
  });

  it('schedules a series challenge', async () => {
    const seriesId = createSeries({ title: 'Challenge Series' });

    const res = await agent.post('/api/admin/challenges').send({
      date: '2030-06-16',
      series_id: seriesId,
    });
    expect(res.status).toBe(201);
  });

  it('schedules a wiki challenge', async () => {
    const personId = createWikiPerson({ name: 'Challenge Person' });

    const res = await agent.post('/api/admin/challenges').send({
      date: '2030-06-17',
      wiki_person_id: personId,
    });
    expect(res.status).toBe(201);
  });

  it('returns 409 when film challenge already scheduled for that date', async () => {
    const filmId = createFilm();
    createChallenge({ filmId, date: '2030-07-01' });

    const filmId2 = createFilm({ title: 'Another Film' });
    const res = await agent.post('/api/admin/challenges').send({
      date: '2030-07-01',
      film_id: filmId2,
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 when date is missing', async () => {
    const filmId = createFilm();
    const res = await agent.post('/api/admin/challenges').send({ film_id: filmId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/date/i);
  });

  it('returns 400 when date format is invalid', async () => {
    const filmId = createFilm();
    const res = await agent.post('/api/admin/challenges').send({
      date: '15-06-2030',
      film_id: filmId,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when neither film_id nor series_id nor wiki_person_id provided', async () => {
    const res = await agent.post('/api/admin/challenges').send({ date: '2030-06-20' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when both film_id and series_id are provided', async () => {
    const filmId = createFilm();
    const seriesId = createSeries();

    const res = await agent.post('/api/admin/challenges').send({
      date: '2030-06-21',
      film_id: filmId,
      series_id: seriesId,
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when film_id refers to inactive film', async () => {
    const filmId = createFilm({ is_active: 0 });

    const res = await agent.post('/api/admin/challenges').send({
      date: '2030-06-22',
      film_id: filmId,
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/admin/challenges/:id', () => {
  it('reassigns a challenge to a different film', async () => {
    const film1 = createFilm({ title: 'Film One' });
    const film2 = createFilm({ title: 'Film Two' });
    const challengeId = createChallenge({ filmId: film1, date: '2030-08-01' });

    const res = await agent.put(`/api/admin/challenges/${challengeId}`).send({
      film_id: film2,
    });
    expect(res.status).toBe(200);
    // formatChallenge returns { id, date, film, series, wiki, mediaType }
    expect(res.body.film.title).toBe('Film Two');
    expect(res.body.date).toBe('2030-08-01');
  });

  it('returns 404 for non-existent challenge', async () => {
    const filmId = createFilm();
    const res = await agent.put('/api/admin/challenges/99999').send({ film_id: filmId });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/challenges/:id', () => {
  it('reassigns challenge entity (same as PUT)', async () => {
    const film1 = createFilm({ title: 'Original' });
    const film2 = createFilm({ title: 'Replacement' });
    const challengeId = createChallenge({ filmId: film1, date: '2030-09-01' });

    const res = await agent.patch(`/api/admin/challenges/${challengeId}`).send({
      film_id: film2,
    });
    expect(res.status).toBe(200);
    expect(res.body.film.title).toBe('Replacement');
  });

  it('returns 404 for non-existent challenge', async () => {
    const filmId = createFilm();
    const res = await agent.patch('/api/admin/challenges/99999').send({ film_id: filmId });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/challenges/:id', () => {
  it('soft-deletes (deactivates) a challenge', async () => {
    const filmId = createFilm();
    const challengeId = createChallenge({ filmId, date: '2030-11-01' });

    const res = await agent.delete(`/api/admin/challenges/${challengeId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('id', challengeId);
  });

  it('returns 404 for non-existent challenge', async () => {
    const res = await agent.delete('/api/admin/challenges/99999');
    expect(res.status).toBe(404);
  });
});

// ─── Wiki persons ─────────────────────────────────────────────────────────────

describe('GET /api/admin/wiki-persons', () => {
  it('returns wiki persons list with data/total shape', async () => {
    createWikiPerson({ name: 'Albert Einstein' });

    const res = await agent.get('/api/admin/wiki-persons');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/admin/wiki-persons', () => {
  it('creates a wiki person and returns its id', async () => {
    const res = await agent.post('/api/admin/wiki-persons').send({
      name: 'Marie Curie',
      person_type: 'scientist',
      wikipedia_slug: 'marie-curie-test',
      hint_schedule: ['birth_year', 'nationality'],
      infobox_data: {},
      difficulty: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when name is missing', async () => {
    const res = await agent.post('/api/admin/wiki-persons').send({
      person_type: 'scientist',
      wikipedia_slug: 'no-name',
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/admin/wiki-persons/:id', () => {
  it('updates a wiki person and returns ok', async () => {
    const personId = createWikiPerson({ name: 'Old Name', slug_fr: 'old-name-unique' });

    const res = await agent.put(`/api/admin/wiki-persons/${personId}`).send({
      name: 'Updated Name',
      person_type: 'politician',
      wikipedia_slug: 'old-name-unique',
      hint_schedule: ['birth_year'],
      infobox_data: {},
      difficulty: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('returns 404 for non-existent person', async () => {
    const res = await agent.put('/api/admin/wiki-persons/99999').send({
      name: 'Ghost',
      person_type: 'politician',
      wikipedia_slug: 'ghost-slug',
      hint_schedule: [],
      infobox_data: {},
      difficulty: 3,
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/wiki-persons/:id', () => {
  it('deletes a wiki person not used in any challenge', async () => {
    const personId = createWikiPerson({ name: 'To Delete Person', slug_fr: 'delete-person-slug' });

    const res = await agent.delete(`/api/admin/wiki-persons/${personId}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent person', async () => {
    const res = await agent.delete('/api/admin/wiki-persons/99999');
    expect(res.status).toBe(404);
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

describe('GET /api/admin/analytics/daily', () => {
  it('returns 200 with array payload', async () => {
    const res = await agent.get('/api/admin/analytics/daily');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/admin/analytics/films', () => {
  it('returns 200 with array payload', async () => {
    const res = await agent.get('/api/admin/analytics/films');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/admin/analytics/series', () => {
  it('returns 200 with array payload', async () => {
    const res = await agent.get('/api/admin/analytics/series');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/admin/stats', () => {
  it('returns 200 with stats object', async () => {
    const res = await agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toBeTypeOf('object');
  });
});
