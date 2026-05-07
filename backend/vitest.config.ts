import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // better-sqlite3 is a native addon — not thread-safe. Must use forks pool with singleFork.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    env: {
      DATABASE_PATH: ':memory:',
      COOKIE_SECRET: 'test_secret_32_bytes_at_least_xyz',
      ADMIN_PASSWORD: 'testpassword123',
      ADMIN_USERNAME: 'testadmin',
      NODE_ENV: 'test',
      MAX_ATTEMPTS: '5',
      WIKI_MAX_ATTEMPTS: '3',
    },
  },
});
