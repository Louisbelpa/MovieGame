import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // better-sqlite3 is a native addon — not thread-safe. Must use forks pool with singleFork.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: [path.resolve(__dirname, './src/test/setup.ts')],
    include: ['src/**/*.test.ts'],
    root: path.resolve(__dirname),
    testTimeout: 10000,
    env: {
      DATABASE_PATH: ':memory:',
      COOKIE_SECRET: 'test_secret_32_bytes_at_least_xyz',
      ADMIN_PASSWORD: 'testpassword123',
      ADMIN_USERNAME: 'testadmin',
      NODE_ENV: 'test',
      MAX_ATTEMPTS: '5',
      WIKI_MAX_ATTEMPTS: '3',
      AUTH_RATE_LIMIT_MAX: '1000',
      LOGIN_RATE_LIMIT_MAX: '1000',
      ADMIN_RATE_LIMIT_MAX: '5000',
      STRICT_ADMIN_RATE_LIMIT_MAX: '5000',
      GUESS_RATE_LIMIT_MAX: '1000',
      SEARCH_RATE_LIMIT_MAX: '1000',
      API_RATE_LIMIT_MAX: '5000',
    },
  },
});
