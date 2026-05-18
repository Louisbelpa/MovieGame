/**
 * Integration tests for auth endpoints.
 * Admin: POST /api/admin/login, POST /api/admin/logout, GET /api/admin/dashboard
 * User:  POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

const VALID_USERNAME = process.env.ADMIN_USERNAME ?? 'testadmin';
const VALID_PASSWORD = process.env.ADMIN_PASSWORD ?? 'testpassword123';

// ─── POST /api/admin/login ────────────────────────────────────────────────────

describe('POST /api/admin/login', () => {
  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: VALID_USERNAME });
    expect(res.status).toBe(400);
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: VALID_USERNAME, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 with correct password but wrong username', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'wronguser', password: VALID_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('returns 200 and sets admin_token cookie on valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: VALID_USERNAME, password: VALID_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Cookie should be set
    const cookies = res.headers['set-cookie'] as string[] | string | undefined;
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : (cookies ?? '');
    expect(cookieStr).toContain('admin_token');
  });
});

// ─── Protected routes ─────────────────────────────────────────────────────────

describe('Protected admin routes', () => {
  it('returns 401 on GET /api/admin/dashboard without cookie', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 200 on GET /api/admin/dashboard with valid cookie', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/admin/login')
      .send({ username: VALID_USERNAME, password: VALID_PASSWORD })
      .expect(200);

    const res = await agent.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
  });

  it('returns 401 after logout', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/admin/login')
      .send({ username: VALID_USERNAME, password: VALID_PASSWORD })
      .expect(200);

    // Verify access works before logout
    await agent.get('/api/admin/dashboard').expect(200);

    // Logout
    await agent.post('/api/admin/logout').expect(200);

    // Access should be denied after logout
    const res = await agent.get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/admin/login').send({});
    expect(res.status).toBe(400);
  });
});

// ─── User auth: POST /api/auth/register ──────────────────────────────────────

function uniqueEmail(): string {
  return `test-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('POST /api/auth/register', () => {
  it('returns 201 and sessionToken with valid payload', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: uniqueEmail(),
      password: 'password123',
      displayName: 'Test User',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ emailVerified: false });
    expect(typeof res.body.sessionToken).toBe('string');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'password123',
      displayName: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: uniqueEmail(),
      password: 'short',
      displayName: 'Test User',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('returns 400 when displayName is empty', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: uniqueEmail(),
      password: 'password123',
      displayName: '',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/display name/i);
  });

  it('returns 400 when displayName is too long (>50 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: uniqueEmail(),
      password: 'password123',
      displayName: 'A'.repeat(51),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already registered', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      displayName: 'First User',
    });
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'anotherpassword',
      displayName: 'Dupe User',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('email is stored case-insensitively', async () => {
    const base = uniqueEmail();
    const upper = base.toUpperCase();
    await request(app).post('/api/auth/register').send({
      email: base,
      password: 'password123',
      displayName: 'User One',
    });
    const res = await request(app).post('/api/auth/register').send({
      email: upper,
      password: 'password123',
      displayName: 'User Two',
    });
    expect(res.status).toBe(409);
  });
});

// ─── User auth: POST /api/auth/login ─────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 and sessionToken with correct credentials', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      displayName: 'Login User',
    });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email.toLowerCase());
    expect(typeof res.body.sessionToken).toBe('string');
  });

  it('returns 401 with wrong password', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      displayName: 'Login User',
    });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: uniqueEmail() });
    expect(res.status).toBe(400);
  });
});

// ─── User auth: GET /api/auth/me ──────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user after login via cookie', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail();
    await agent.post('/api/auth/register').send({
      email,
      password: 'password123',
      displayName: 'Me User',
    });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    const user = res.body.user ?? res.body;
    expect(user.email).toBe(email.toLowerCase());
    expect(user.displayName).toBe('Me User');
  });

  it('returns current user when authenticated via Bearer token', async () => {
    const email = uniqueEmail();
    const regRes = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      displayName: 'Bearer User',
    });
    const { sessionToken } = regRes.body as { sessionToken: string };

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(res.status).toBe(200);
    const user = res.body.user ?? res.body;
    expect(user.email).toBe(email.toLowerCase());
  });

  it('returns 401 after logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      email: uniqueEmail(),
      password: 'password123',
      displayName: 'Logout User',
    });

    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(200);

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
