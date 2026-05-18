const path = require('node:path');

const testDir = __dirname;
const appDir = path.resolve(testDir, '..');
const repoDir = path.resolve(appDir, '../..');

module.exports = {
  root: appDir,
  resolve: {
    alias: {
      '@': path.resolve(appDir, 'src'),
      '@esap-mfe/shared-ui': path.resolve(repoDir, 'packages/shared-ui/src'),
      '@esap-mfe/shared-types': path.resolve(repoDir, 'packages/shared-types/src'),
      mammoth: path.resolve(repoDir, 'node_modules/mammoth/mammoth.browser.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(testDir, 'setup.ts')],
    include: ['test/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
  },
};
