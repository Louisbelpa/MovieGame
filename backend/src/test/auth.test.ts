/**
 * Integration tests for admin auth endpoints.
 * POST /api/admin/login  — POST /api/admin/logout
 * GET  /api/admin/dashboard (protected route)
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
});
